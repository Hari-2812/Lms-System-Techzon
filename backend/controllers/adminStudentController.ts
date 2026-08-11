import { Request, Response } from 'express';
import User from '../models/User';
import logger from '../config/logger';
import { generateSecureTemporaryPassword } from '../utils/passwordGenerator';
import { sendCredentialsResetEmail } from '../services/email';

export const updateStudentDetails = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.params;
  const { name, email, phone, city, qualification, dateOfBirth, gender, address, state, pincode, college, occupation, experience } = req.body;

  try {
    const student = await User.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== student.email) {
        // Check for duplicates
        const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: studentId } });
        if (existingUser) {
          res.status(400).json({ success: false, message: 'A student with this email already exists.' });
          return;
        }
        student.email = normalizedEmail;
      }
    }

    if (name) student.name = name;

    // Update studentProfile nested fields
    if (!student.studentProfile) {
      student.studentProfile = {};
    }

    if (phone !== undefined) student.studentProfile.phone = phone;
    if (city !== undefined) student.studentProfile.city = city;
    if (qualification !== undefined) student.studentProfile.qualification = qualification;
    if (dateOfBirth !== undefined) student.studentProfile.dateOfBirth = dateOfBirth;
    if (gender !== undefined) student.studentProfile.gender = gender;
    if (address !== undefined) student.studentProfile.address = address;
    if (state !== undefined) student.studentProfile.state = state;
    if (pincode !== undefined) student.studentProfile.pincode = pincode;
    if (college !== undefined) student.studentProfile.college = college;
    if (occupation !== undefined) student.studentProfile.occupation = occupation;
    if (experience !== undefined) student.studentProfile.experience = experience;

    await student.save();

    logger.info(`[ADMIN_ACTION] Student ${student.email} details updated by admin ${(req as any).user.email}`);

    res.status(200).json({ success: true, message: 'Student details updated successfully.', data: student });
  } catch (error: any) {
    logger.error('Error updating student details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resendStudentCredentials = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.params;

  try {
    const student = await User.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    // 1. Generate new temp password
    const newTempPassword = generateSecureTemporaryPassword();

    // 2. Set new password and flag
    student.password = newTempPassword;
    student.needsPasswordChange = true;
    
    // 3. Save to database (Mongoose pre-save hook will hash it)
    await student.save();

    // 4. Send email
    let emailSent = false;
    try {
      await sendCredentialsResetEmail(student.email, student.name, newTempPassword);
      emailSent = true;
      logger.info(`[ADMIN_ACTION] Login credentials resent successfully to ${student.email} by admin ${(req as any).user.email}`);
    } catch (emailErr: any) {
      logger.error(`[EMAIL_ERROR] Failed to send credentials to ${student.email}:`, emailErr);
      // We don't fail the request, we just notify the admin the email failed
    }

    if (emailSent) {
      res.status(200).json({
        success: true,
        message: 'Login credentials sent successfully',
        email: student.email,
        emailSent: true
      });
    } else {
      // Password was changed but email failed
      res.status(200).json({
        success: true,
        message: 'Login credentials updated, but the email could not be sent. Please retry sending the credentials.',
        email: student.email,
        emailSent: false
      });
    }
  } catch (error: any) {
    logger.error('Error resending student credentials:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
