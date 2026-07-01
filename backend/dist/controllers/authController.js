"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.logoutFromAllDevices = exports.logout = exports.updatePassword = exports.handleRefreshToken = exports.verifyOTPAndLogin = exports.loginWithPassword = exports.sendOTP = void 0;
const User_1 = __importDefault(require("../models/User"));
const OTP_1 = __importDefault(require("../models/OTP"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const token_1 = require("../utils/token");
const email_1 = require("../services/email");
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../config/logger"));
// Helper to generate 6-digit numeric OTP
const generateOTPCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
const sendOTP = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ success: false, message: 'Email address is required' });
        return;
    }
    try {
        // Only pre-registered users (via Razorpay webhook or admin create) can request OTP
        const user = await User_1.default.findOne({ email: email.toLowerCase() });
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
        await OTP_1.default.findOneAndUpdate({ email: email.toLowerCase() }, { code, expiresAt }, { upsert: true });
        // Send email
        await (0, email_1.sendOTPEmail)(email.toLowerCase(), code);
        res.status(200).json({ success: true, message: 'Verification OTP sent to your email' });
    }
    catch (error) {
        logger_1.default.error('Error generating/sending OTP:', error);
        res.status(500).json({ success: false, message: 'Error sending verification code' });
    }
};
exports.sendOTP = sendOTP;
const loginWithPassword = async (req, res) => {
    const { email, password, deviceId, userAgent } = req.body;
    if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required' });
        return;
    }
    try {
        const user = await User_1.default.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        if (user.status !== 'active') {
            res.status(403).json({ success: false, message: 'User account is inactive or suspended' });
            return;
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        // Login successful - track device
        const dId = deviceId || crypto_1.default.randomBytes(8).toString('hex');
        const existingDeviceIndex = user.devices.findIndex((d) => d.deviceId === dId);
        const devObj = {
            deviceId: dId,
            userAgent: userAgent || req.headers['user-agent'] || 'Unknown Device',
            ip: req.ip || '127.0.0.1',
            lastActive: new Date(),
        };
        if (existingDeviceIndex > -1) {
            user.devices[existingDeviceIndex] = devObj;
        }
        else {
            user.devices.push(devObj);
        }
        await user.save();
        // Generate tokens
        const accessToken = (0, token_1.generateAccessToken)({ id: user._id.toString(), role: user.role });
        const refreshToken = (0, token_1.generateRefreshToken)({ id: user._id.toString() });
        // Set refresh token as secure cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        await AuditLog_1.default.create({
            userId: user._id,
            action: 'LOGIN_PASSWORD',
            details: `Logged in using password. Device: ${devObj.userAgent}`,
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
    }
    catch (error) {
        logger_1.default.error('Error logging in with password:', error);
        res.status(500).json({ success: false, message: 'Internal server login error' });
    }
};
exports.loginWithPassword = loginWithPassword;
const verifyOTPAndLogin = async (req, res) => {
    const { email, code, deviceId, userAgent } = req.body;
    if (!email || !code) {
        res.status(400).json({ success: false, message: 'Email and verification OTP are required' });
        return;
    }
    try {
        const user = await User_1.default.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(404).json({ success: false, message: 'User not registered' });
            return;
        }
        const otpRecord = await OTP_1.default.findOne({ email: email.toLowerCase(), code });
        if (!otpRecord || otpRecord.expiresAt < new Date()) {
            res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
            return;
        }
        // OTP is valid - delete it
        await OTP_1.default.deleteOne({ _id: otpRecord._id });
        // Mark email as verified if not done already
        if (!user.isEmailVerified) {
            user.isEmailVerified = true;
        }
        // Login successful - track device
        const dId = deviceId || crypto_1.default.randomBytes(8).toString('hex');
        const existingDeviceIndex = user.devices.findIndex((d) => d.deviceId === dId);
        const devObj = {
            deviceId: dId,
            userAgent: userAgent || req.headers['user-agent'] || 'Unknown Device',
            ip: req.ip || '127.0.0.1',
            lastActive: new Date(),
        };
        if (existingDeviceIndex > -1) {
            user.devices[existingDeviceIndex] = devObj;
        }
        else {
            user.devices.push(devObj);
        }
        await user.save();
        // Generate tokens
        const accessToken = (0, token_1.generateAccessToken)({ id: user._id.toString(), role: user.role });
        const refreshToken = (0, token_1.generateRefreshToken)({ id: user._id.toString() });
        // Set refresh token cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        await AuditLog_1.default.create({
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
    }
    catch (error) {
        logger_1.default.error('Error verifying OTP and logging in:', error);
        res.status(500).json({ success: false, message: 'Internal server verification error' });
    }
};
exports.verifyOTPAndLogin = verifyOTPAndLogin;
const handleRefreshToken = async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) {
        res.status(401).json({ success: false, message: 'No refresh token provided' });
        return;
    }
    try {
        const decoded = (0, token_1.verifyRefreshToken)(token);
        const user = await User_1.default.findById(decoded.id);
        if (!user || user.status !== 'active') {
            res.status(401).json({ success: false, message: 'Unauthorized session' });
            return;
        }
        const accessToken = (0, token_1.generateAccessToken)({ id: user._id.toString(), role: user.role });
        res.status(200).json({ success: true, token: accessToken });
    }
    catch (error) {
        res.status(401).json({ success: false, message: 'Invalid session' });
    }
};
exports.handleRefreshToken = handleRefreshToken;
const updatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Current and new password are required' });
        return;
    }
    try {
        const user = await User_1.default.findById(req.user._id);
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
        await AuditLog_1.default.create({
            userId: user._id,
            action: 'UPDATE_PASSWORD',
            details: 'Password was updated successfully.',
        });
        res.status(200).json({ success: true, message: 'Password updated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal error updating password' });
    }
};
exports.updatePassword = updatePassword;
const logout = async (req, res) => {
    const { deviceId } = req.body;
    try {
        if (req.user && deviceId) {
            await User_1.default.findByIdAndUpdate(req.user._id, {
                $pull: { devices: { deviceId } },
            });
        }
        res.clearCookie('refreshToken');
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Logout failed' });
    }
};
exports.logout = logout;
const logoutFromAllDevices = async (req, res) => {
    try {
        if (req.user) {
            await User_1.default.findByIdAndUpdate(req.user._id, {
                $set: { devices: [] },
            });
        }
        res.clearCookie('refreshToken');
        res.status(200).json({ success: true, message: 'Logged out from all devices successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Logout from all devices failed' });
    }
};
exports.logoutFromAllDevices = logoutFromAllDevices;
const getMe = async (req, res) => {
    res.status(200).json({ success: true, data: req.user });
};
exports.getMe = getMe;
