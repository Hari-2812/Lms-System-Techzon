import { Request, Response } from 'express';
import User from '../models/User';
import Course from '../models/Course';
import Enrollment from '../models/Enrollment';
import Payment from '../models/Payment';
import LiveClass from '../models/LiveClass';
import SupportTicket from '../models/SupportTicket';
import AuditLog from '../models/AuditLog';
import Settings from '../models/Settings';
import Submission from '../models/Submission';
import QuizResult from '../models/QuizResult';
import logger from '../config/logger';

// Seed default settings if they do not exist
export const seedDefaultSettings = async (): Promise<void> => {
  const count = await Settings.countDocuments();
  if (count > 0) return;

  const defaultSettings = new Settings({
    appName: 'Techzon LMS System',
    companyName: 'Techzon Wide',
    supportEmail: 'support@techzonwide.com',
    supportNumber: '+91 6374191654',
    maintenanceMode: false,
  });
  await defaultSettings.save();
  logger.info('Default System Settings seeded successfully.');
};

export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({
        appName: 'Techzon LMS System',
        companyName: 'Techzon Wide',
        supportEmail: 'support@techzonwide.com',
        supportNumber: '+91 6374191654',
      });
      await settings.save();
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSettings = async (req: any, res: Response): Promise<void> => {
  try {
    const settings = await Settings.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    await AuditLog.create({
      userId: req.user._id,
      action: 'UPDATE_SETTINGS',
      details: 'Updated global system settings.',
    });

    res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await AuditLog.find()
      .populate('userId', 'name email role')
      .sort('-createdAt')
      .limit(100);
    res.status(200).json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Admin Dashboard Analytics
export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalMentors = await User.countDocuments({ role: 'mentor' });
    const totalCourses = await Course.countDocuments();
    const activeEnrollments = await Enrollment.countDocuments({ status: 'active' });

    // Revenue summation
    const payments = await Payment.find({ status: 'captured' });
    const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);

    const pendingTickets = await SupportTicket.countDocuments({ status: { $ne: 'closed' } });

    // Recent Payments
    const recentPayments = await Payment.find()
      .sort('-createdAt')
      .limit(5);

    // Recent Activity Logs
    const recentAuditLogs = await AuditLog.find()
      .populate('userId', 'name email')
      .sort('-createdAt')
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalMentors,
        totalCourses,
        activeEnrollments,
        totalRevenue,
        pendingTickets,
        recentPayments,
        recentAuditLogs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Student Dashboard Analytics
export const getStudentStats = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user._id;

    const enrollments = await Enrollment.find({ studentId }).populate('courseId', 'title category thumbnailUrl');
    const coursesCount = enrollments.length;

    // Completed courses count (percentComplete === 100)
    const completedCoursesCount = enrollments.filter((e) => e.progress?.percentComplete === 100).length;

    // Completed quiz count
    const quizAttempts = await QuizResult.countDocuments({ studentId });
    const passedQuizzes = await QuizResult.countDocuments({ studentId, passed: true });

    // Completed assignment submissions
    const assignmentSubmissions = await Submission.countDocuments({ studentId });

    // Pending support tickets
    const supportTickets = await SupportTicket.find({ studentId }).sort('-createdAt');

    // Upcoming Live Classes (scheduled check)
    const liveClasses = await LiveClass.find({ status: 'scheduled' })
      .populate('courseId', 'title')
      .populate('mentorId', 'name')
      .sort('scheduledTime')
      .limit(3);

    res.status(200).json({
      success: true,
      data: {
        coursesCount,
        completedCoursesCount,
        quizAttempts,
        passedQuizzes,
        assignmentSubmissions,
        enrollments,
        supportTickets,
        liveClasses,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Mentor Dashboard Analytics
export const getMentorStats = async (req: any, res: Response): Promise<void> => {
  try {
    const mentorId = req.user._id;

    // Find courses where mentor is assigned
    const courses = await Course.find({ mentors: mentorId });
    const courseIds = courses.map((c) => c._id);

    // Number of students enrolled in mentor's courses
    const studentEnrollments = await Enrollment.countDocuments({
      courseId: { $in: courseIds },
      status: 'active',
    });

    // Scheduled classes count
    const liveClassesScheduled = await LiveClass.countDocuments({
      mentorId,
      status: 'scheduled',
    });

    // Submissions pending grading
    const submissions = await Submission.find()
      .populate('assignmentId')
      .populate('studentId', 'name email');

    // Filter submissions belonging to mentor's assigned courses
    const pendingGradingSubmissions = submissions.filter((sub: any) => {
      return (
        sub.status === 'submitted' &&
        sub.assignmentId &&
        courseIds.some((cid) => cid.toString() === sub.assignmentId.courseId.toString())
      );
    });

    res.status(200).json({
      success: true,
      data: {
        assignedCoursesCount: courses.length,
        totalEnrolledStudents: studentEnrollments,
        scheduledLiveClasses: liveClassesScheduled,
        pendingGradingCount: pendingGradingSubmissions.length,
        pendingSubmissions: pendingGradingSubmissions,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Export Reports as CSV
export const exportReport = async (req: Request, res: Response): Promise<void> => {
  const { type } = req.query; // 'payments', 'enrollments', 'students'
  try {
    let csvData = '';

    if (type === 'payments') {
      const payments = await Payment.find().sort('-createdAt');
      csvData = 'Payment ID,Order ID,Student Name,Student Email,Amount,Status,Date\n';
      payments.forEach((p) => {
        csvData += `"${p.paymentId || ''}","${p.orderId}","${p.studentName}","${p.studentEmail}",${p.amount},"${p.status}","${p.createdAt.toISOString()}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.attachment('payments_report.csv');
      res.status(200).send(csvData);
      return;
    }

    if (type === 'enrollments') {
      const enrollments = await Enrollment.find()
        .populate('studentId', 'name email')
        .populate('courseId', 'title')
        .populate('learningPlanId', 'name');

      csvData = 'Student Name,Student Email,Course,Plan,Progress,Status,Expiry Date\n';
      enrollments.forEach((e: any) => {
        csvData += `"${e.studentId?.name || 'Deleted'}","${e.studentId?.email || ''}","${e.courseId?.title || ''}","${e.learningPlanId?.name || ''}",${e.progress?.percentComplete || 0},"${e.status}","${e.expiryDate.toISOString()}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.attachment('enrollments_report.csv');
      res.status(200).send(csvData);
      return;
    }

    res.status(400).json({ success: false, message: 'Invalid or missing report type. Use type=payments or type=enrollments.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
