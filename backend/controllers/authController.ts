import { Request, Response } from 'express';
import User from '../models/User';
import OTP from '../models/OTP';
import AuditLog from '../models/AuditLog';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token';
import { sendOTPEmail } from '../services/email';
import crypto from 'crypto';
import logger from '../config/logger';

// Helper to generate 6-digit numeric OTP
const generateOTPCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: 'Email address is required' });
    return;
  }

  try {
    // Only pre-registered users (via Razorpay webhook or admin create) can request OTP
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Email not registered. Access denied. Please purchase a course to register.',
      });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ success: false, message: 'User account is inactive or suspended' });
      return;
    }

    const code = generateOTPCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save to database
    await OTP.findOneAndUpdate(
      { email: email.toLowerCase() },
      { code, expiresAt },
      { upsert: true }
    );

    // Send email
    await sendOTPEmail(email.toLowerCase(), code);

    res.status(200).json({ success: true, message: 'Verification OTP sent to your email' });
  } catch (error) {
    logger.error('Error generating/sending OTP:', error);
    res.status(500).json({ success: false, message: 'Error sending verification code' });
  }
};

export const loginWithPassword = async (req: Request, res: Response): Promise<void> => {
  const { email, password, deviceId, userAgent } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required' });
    return;
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    if (user.status === 'inactive') {
      res.status(403).json({ success: false, message: 'Account inactive' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ success: false, message: 'Account suspended' });
      return;
    }

    if (!user.isEmailVerified) {
      res.status(403).json({ success: false, message: 'Email not verified' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Incorrect password' });
      return;
    }

    // Login successful - track device
    const dId = deviceId || crypto.randomBytes(8).toString('hex');
    const existingDeviceIndex = user.devices.findIndex((d) => d.deviceId === dId);

    const devObj = {
      deviceId: dId,
      userAgent: userAgent || req.headers['user-agent'] || 'Unknown Device',
      ip: req.ip || '127.0.0.1',
      lastActive: new Date(),
    };

    if (existingDeviceIndex > -1) {
      user.devices[existingDeviceIndex] = devObj;
    } else {
      user.devices.push(devObj);
    }
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken({ id: user._id.toString(), role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id.toString() });

    // Set refresh token as secure cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    await AuditLog.create({
      userId: user._id,
      action: 'LOGIN_PASSWORD',
      details: `Logged in using password. Device: ${devObj.userAgent}`,
    });

    res.status(200).json({
      success: true,
      token: accessToken,
      accessToken: accessToken,
      refreshToken: refreshToken,
      deviceId: dId,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Error logging in with password:', error);
    res.status(500).json({ success: false, message: 'Internal server login error' });
  }
};

export const verifyOTPAndLogin = async (req: Request, res: Response): Promise<void> => {
  const { email, code, deviceId, userAgent } = req.body;

  if (!email || !code) {
    res.status(400).json({ success: false, message: 'Email and verification OTP are required' });
    return;
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not registered' });
      return;
    }

    const otpRecord = await OTP.findOne({ email: email.toLowerCase(), code });
    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
      return;
    }

    // OTP is valid - delete it
    await OTP.deleteOne({ _id: otpRecord._id });

    // Mark email as verified if not done already
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
    }

    // Login successful - track device
    const dId = deviceId || crypto.randomBytes(8).toString('hex');
    const existingDeviceIndex = user.devices.findIndex((d) => d.deviceId === dId);

    const devObj = {
      deviceId: dId,
      userAgent: userAgent || req.headers['user-agent'] || 'Unknown Device',
      ip: req.ip || '127.0.0.1',
      lastActive: new Date(),
    };

    if (existingDeviceIndex > -1) {
      user.devices[existingDeviceIndex] = devObj;
    } else {
      user.devices.push(devObj);
    }
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken({ id: user._id.toString(), role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id.toString() });

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await AuditLog.create({
      userId: user._id,
      action: 'LOGIN_OTP',
      details: `Logged in using OTP. Device: ${devObj.userAgent}`,
    });

    res.status(200).json({
      success: true,
      token: accessToken,
      deviceId: dId,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Error verifying OTP and logging in:', error);
    res.status(500).json({ success: false, message: 'Internal server verification error' });
  }
};

export const handleRefreshToken = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies.refreshToken;

  if (!token) {
    res.status(401).json({ success: false, message: 'No refresh token provided' });
    return;
  }

  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);

    if (!user || user.status !== 'active') {
      res.status(401).json({ success: false, message: 'Unauthorized session' });
      return;
    }

    const accessToken = generateAccessToken({ id: user._id.toString(), role: user.role });
    res.status(200).json({ success: true, token: accessToken });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid session' });
  }
};

export const updatePassword = async (req: any, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, message: 'Current and new password are required' });
    return;
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Incorrect current password' });
      return;
    }

    user.password = newPassword;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: 'UPDATE_PASSWORD',
      details: 'Password was updated successfully.',
    });

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error updating password' });
  }
};

export const logout = async (req: any, res: Response): Promise<void> => {
  const { deviceId } = req.body;
  try {
    if (req.user && deviceId) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { devices: { deviceId } },
      });
    }

    res.clearCookie('refreshToken');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

export const logoutFromAllDevices = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: { devices: [] },
      });
    }

    res.clearCookie('refreshToken');
    res.status(200).json({ success: true, message: 'Logged out from all devices successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout from all devices failed' });
  }
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: req.user });
};
