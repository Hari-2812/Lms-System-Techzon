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

export const deleteStudentCompletely = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.params;
  const adminId = (req as any).user._id;
  const adminEmail = (req as any).user.email;

  // Dynamically import models to prevent circular dependencies if any, 
  // or we can just require them inline. For safety, let's require them inline here.
  const Enrollment = require('../models/Enrollment').default;
  const Progress = require('../models/Progress').default;
  const Certificate = require('../models/Certificate').default;
  const Submission = require('../models/Submission').default;
  const QuizResult = require('../models/QuizResult').default;
  const SupportTicket = require('../models/SupportTicket').default;
  const Notification = require('../models/Notification').default;
  const OnboardingRequest = require('../models/OnboardingRequest').default;
  const AuditLog = require('../models/AuditLog').default;
  const mongoose = require('mongoose');

  try {
    const student = await User.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    if (student.role === 'Admin' || student.role === 'SuperAdmin') {
      res.status(403).json({ success: false, message: 'Cannot delete an administrator account from Student Directory.' });
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    let deletedStats = {
      student: false,
      enrollments: 0,
      progressRecords: 0,
      certificates: 0,
      submissions: 0,
      quizResults: 0,
      supportTickets: 0,
      notifications: 0,
    };

    try {
      // Delete student-owned records
      const enrollmentsDel = await Enrollment.deleteMany({ studentId }, { session });
      deletedStats.enrollments = enrollmentsDel.deletedCount || 0;

      const progressDel = await Progress.deleteMany({ userId: studentId }, { session });
      deletedStats.progressRecords = progressDel.deletedCount || 0;

      const certsDel = await Certificate.deleteMany({ studentId }, { session });
      deletedStats.certificates = certsDel.deletedCount || 0;

      const subDel = await Submission.deleteMany({ studentId }, { session });
      deletedStats.submissions = subDel.deletedCount || 0;

      const quizDel = await QuizResult.deleteMany({ studentId }, { session });
      deletedStats.quizResults = quizDel.deletedCount || 0;

      const ticketDel = await SupportTicket.deleteMany({ studentId }, { session });
      deletedStats.supportTickets = ticketDel.deletedCount || 0;

      const notifDel = await Notification.deleteMany({ recipientId: studentId }, { session });
      deletedStats.notifications = notifDel.deletedCount || 0;

      // Update OnboardingRequest instead of deleting, so sync doesn't recreate it
      await OnboardingRequest.updateMany(
        { userId: studentId }, 
        { $unset: { userId: 1 }, status: 'REJECTED' }, // Using REJECTED or keeping APPROVED but unlinking. Let's use REJECTED to signify manual deletion.
        { session }
      );

      // Finally, delete the student
      await User.findByIdAndDelete(studentId, { session });
      deletedStats.student = true;

      // Audit Log
      await AuditLog.create([{
        userId: adminId,
        action: 'STUDENT_PERMANENTLY_DELETED',
        details: `Deleted student ${student.email} (${studentId})`,
      }], { session });

      await session.commitTransaction();
      session.endSession();

      logger.info(`[ADMIN_ACTION] Student ${student.email} permanently deleted by ${adminEmail}`);

      res.status(200).json({
        success: true,
        message: 'Student permanently removed from the LMS',
        studentId,
        deleted: deletedStats
      });

    } catch (txError: any) {
      await session.abortTransaction();
      session.endSession();
      throw txError;
    }

  } catch (error: any) {
    logger.error('Error permanently deleting student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
