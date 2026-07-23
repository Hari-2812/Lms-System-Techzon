import { Request, Response } from 'express';
import User from '../models/User';
import Course from '../models/Course';
import Lesson from '../models/Lesson';
import Enrollment from '../models/Enrollment';
import Payment from '../models/Payment';
import LiveClass from '../models/LiveClass';
import SupportTicket from '../models/SupportTicket';
import AuditLog from '../models/AuditLog';
import Settings from '../models/Settings';
import Submission from '../models/Submission';
import QuizResult from '../models/QuizResult';
import Onboarding from '../models/Onboarding';
import Notification from '../models/Notification';
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

export const clearTestData = async (req: any, res: Response): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    res.status(403).json({ success: false, message: 'Clear Test Data is only available in development mode.' });
    return;
  }

  try {
    const userDuplicateGroups = await User.aggregate([
      { $match: { role: 'Student', email: { $exists: true, $ne: '' } } },
      { $group: { _id: '$email', docs: { $push: { _id: '$_id', createdAt: '$createdAt' } }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    let duplicateUsersRemoved = 0;
    for (const group of userDuplicateGroups) {
      group.docs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const idsToRemove = group.docs.slice(1).map((doc: any) => doc._id);
      if (idsToRemove.length > 0) {
        const { deletedCount } = await User.deleteMany({ _id: { $in: idsToRemove } });
        duplicateUsersRemoved += deletedCount || 0;
      }
    }

    const onboardingDuplicateGroups = await Onboarding.aggregate([
      { $match: { email: { $exists: true, $ne: '' } } },
      { $group: { _id: '$email', docs: { $push: { _id: '$_id', createdAt: '$createdAt' } }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    let duplicateOnboardingsRemoved = 0;
    for (const group of onboardingDuplicateGroups) {
      group.docs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const idsToRemove = group.docs.slice(1).map((doc: any) => doc._id);
      if (idsToRemove.length > 0) {
        const { deletedCount } = await Onboarding.deleteMany({ _id: { $in: idsToRemove } });
        duplicateOnboardingsRemoved += deletedCount || 0;
      }
    }

    const enrollmentDuplicateGroups = await Enrollment.aggregate([
      { $group: { _id: { studentId: '$studentId', courseId: '$courseId' }, docs: { $push: { _id: '$_id', createdAt: '$createdAt' } }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    let duplicateEnrollmentsRemoved = 0;
    for (const group of enrollmentDuplicateGroups) {
      group.docs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const idsToRemove = group.docs.slice(1).map((doc: any) => doc._id);
      if (idsToRemove.length > 0) {
        const { deletedCount } = await Enrollment.deleteMany({ _id: { $in: idsToRemove } });
        duplicateEnrollmentsRemoved += deletedCount || 0;
      }
    }

    const notificationDuplicateGroups = await Notification.aggregate([
      { $match: { isRead: false, type: { $exists: true }, 'metadata.email': { $exists: true, $ne: '' } } },
      { $group: { _id: { type: '$type', email: '$metadata.email' }, docs: { $push: { _id: '$_id', createdAt: '$createdAt' } }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    let duplicateNotificationsRemoved = 0;
    for (const group of notificationDuplicateGroups) {
      group.docs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const idsToRemove = group.docs.slice(1).map((doc: any) => doc._id);
      if (idsToRemove.length > 0) {
        const { deletedCount } = await Notification.deleteMany({ _id: { $in: idsToRemove } });
        duplicateNotificationsRemoved += deletedCount || 0;
      }
    }

    const testPattern = [
      { email: { $regex: /@example\.com$/i } },
      { email: { $regex: /^test/i } },
      { email: { $regex: /demo/i } },
      { fullName: { $regex: /(test|demo)/i } },
    ];

    const testUsersDeleted = (await User.deleteMany({ role: 'Student', $or: testPattern })).deletedCount || 0;
    const testOnboardingsDeleted = (await Onboarding.deleteMany({ $or: testPattern })).deletedCount || 0;
    const testNotificationsDeleted = (await Notification.deleteMany({
      $or: [
        { 'metadata.email': { $regex: /@example\.com$/i } },
        { 'metadata.email': { $regex: /^test/i } },
        { 'metadata.email': { $regex: /demo/i } },
        { title: { $regex: /(test|demo)/i } },
        { message: { $regex: /(test|demo)/i } },
      ],
    })).deletedCount || 0;

    await AuditLog.create({
      userId: req.user._id,
      action: 'CLEAR_TEST_DATA',
      details: `Cleared development test records: duplicate users ${duplicateUsersRemoved}, duplicate onboardings ${duplicateOnboardingsRemoved}, duplicate enrollments ${duplicateEnrollmentsRemoved}, duplicate notifications ${duplicateNotificationsRemoved}, test users ${testUsersDeleted}, test onboardings ${testOnboardingsDeleted}, test notifications ${testNotificationsDeleted}`,
    });

    res.status(200).json({
      success: true,
      data: {
        duplicateUsersRemoved,
        duplicateOnboardingsRemoved,
        duplicateEnrollmentsRemoved,
        duplicateNotificationsRemoved,
        testUsersDeleted,
        testOnboardingsDeleted,
        testNotificationsDeleted,
      },
    });
  } catch (error: any) {
    logger.error('Error clearing test data:', error);
    res.status(500).json({ success: false, error: error.message });
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
    const totalStudents = await User.countDocuments({ role: 'Student' });
    const totalMentors = await User.countDocuments({ role: 'Mentor' });
    const totalCourses = await Course.countDocuments();
    const activeEnrollments = await Enrollment.countDocuments({ status: 'active' });

    // Onboarding summation instead of payments
    const pendingOnboardingRequests = await Onboarding.countDocuments({ status: 'pending' });
    const totalOnboardingRequests = await Onboarding.countDocuments();

    const pendingTickets = await SupportTicket.countDocuments({ status: { $ne: 'closed' } });

    // Recent Onboarding Requests instead of payments
    const recentOnboardings = await Onboarding.find()
      .populate('courses', 'title')
      .populate('learningPlan', 'name')
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
        pendingOnboardingRequests,
        totalOnboardingRequests,
        pendingTickets,
        recentOnboardings,
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

    if (coursesCount === 0) {
      res.status(403).json({
        success: false,
        message: 'Your LMS access has not been activated. Please contact Techzon Wide Support.',
      });
      return;
    }

    // Fetch enhanced enrollments
    const enhancedEnrollments = await Promise.all(enrollments.map(async (e: any) => {
      const eObj = e.toObject();
      const courseId = e.courseId?._id;
      if (!courseId) return eObj;
      
      const allLessons = await Lesson.find({ courseId }).sort('order').lean();
      const totalLessons = allLessons.length;
      const completedIds = e.progress?.completedLessons?.map((id: any) => id.toString()) || [];
      const lessonsCompleted = completedIds.length;
      const remainingLessons = totalLessons - lessonsCompleted;
      
      let currentLesson = null;
      let nextLesson = null;
      
      if (totalLessons > 0) {
        const firstUncompletedIndex = allLessons.findIndex((l: any) => !completedIds.includes(l._id.toString()));
        if (firstUncompletedIndex !== -1) {
          currentLesson = allLessons[firstUncompletedIndex];
          if (firstUncompletedIndex + 1 < allLessons.length) {
            nextLesson = allLessons[firstUncompletedIndex + 1];
          }
        }
      }
      
      return {
        ...eObj,
        lessonsCompleted,
        remainingLessons,
        currentLesson,
        nextLesson,
        totalLessons
      };
    }));

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
        enrollments: enhancedEnrollments,
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

    if (type === 'onboardings') {
      const onboardings = await Onboarding.find().populate('courses', 'title').populate('learningPlan', 'name');
      csvData = 'Student Name,Student Email,Phone,College,Degree,City,State,Courses,Plan,Status,Date\n';
      onboardings.forEach((o: any) => {
        const courseTitles = o.courses ? o.courses.map((c: any) => c.title).join(' | ') : '';
        csvData += `"${o.fullName}","${o.email}","${o.phone}","${o.college}","${o.degree}","${o.city}","${o.state}","${courseTitles}","${o.learningPlan?.name || ''}","${o.status}","${o.createdAt.toISOString()}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.attachment('onboarding_requests_report.csv');
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

    res.status(400).json({ success: false, message: 'Invalid or missing report type. Use type=onboardings or type=enrollments.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

import mongoose from 'mongoose';

export const getAdminStudentsList = async (req: Request, res: Response): Promise<void> => {
  try {
    const students = await User.find({ role: 'Student' }).select('-password -__v').lean();

    const studentsWithAnalytics = await Promise.all(
      students.map(async (student) => {
        const enrollments = await Enrollment.find({ studentId: student._id }).populate('courseId', 'title').lean();
        
        let overallProgress = 0;
        let lastActive: Date | string = 'Never';
        let currentCourse = 'N/A';
        let batch = 'N/A';

        if (enrollments.length > 0) {
          const totalProgress = enrollments.reduce((sum, e) => sum + (e.progress?.percentComplete || 0), 0);
          overallProgress = Math.round(totalProgress / enrollments.length);
          
          const sorted = [...enrollments].sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          currentCourse = (sorted[0].courseId as any)?.title || 'N/A';
          batch = sorted[0].batch || 'N/A';
        }

        const lastProgress = await mongoose.model('Progress').findOne({ userId: student._id }).sort({ lastWatched: -1 }).lean() as any;
        if (lastProgress && lastProgress.lastWatched) {
          lastActive = lastProgress.lastWatched;
        }

        return {
          ...student,
          enrolledCourses: enrollments.map((e) => (e.courseId as any)?._id || e.courseId),
          enrolledCourseCount: enrollments.length,
          overallProgress,
          currentCourse,
          lastActive,
          batch,
        };
      })
    );

    res.status(200).json({ success: true, data: studentsWithAnalytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getStudentAnalyticsDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const student = await User.findById(id).select('-password').lean();
    
    if (!student || student.role !== 'Student') {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const enrollments = await Enrollment.find({ studentId: id })
      .populate('courseId', 'title category thumbnailUrl')
      .populate('certificateId')
      .lean();

    const coursesAnalytics = await Promise.all(enrollments.map(async (enrollment: any) => {
      const courseId = enrollment.courseId?._id;
      if (!courseId) return null;

      const lessons = await Lesson.find({ courseId }).sort('order').lean();
      const progressDocs = await mongoose.model('Progress').find({ userId: id, courseId }).lean();
      
      let timeSpentSeconds = 0;
      let lastCompletedLesson = null;
      let currentLesson = null;

      const timeline = lessons.map((les: any, index: number) => {
        const pDoc = progressDocs.find((p: any) => p.lessonId.toString() === les._id.toString()) as any;
        
        if (pDoc) {
          timeSpentSeconds += pDoc.lastPlaybackPosition || 0;
        }

        const isCompleted = enrollment.progress?.completedLessons?.some((cl: any) => cl.toString() === les._id.toString());
        const isLocked = index > 0 && !enrollment.progress?.completedLessons?.some((cl: any) => cl.toString() === lessons[index - 1]._id.toString());

        let status = 'Locked';
        if (isCompleted) {
          status = 'Completed';
          if (!lastCompletedLesson || (pDoc && pDoc.completedAt && new Date(pDoc.completedAt) > new Date(lastCompletedLesson.completedAt))) {
            lastCompletedLesson = { ...les, completedAt: pDoc?.completedAt };
          }
        } else if (!isLocked) {
          status = pDoc && pDoc.watchedPercentage > 0 ? 'Watching' : 'Unlocked';
          if (!currentLesson) currentLesson = les;
        }

        return {
          lessonId: les._id,
          title: les.title,
          status,
          watchPercentage: pDoc?.watchedPercentage || 0,
          resumePosition: pDoc?.lastPlaybackPosition || 0,
          completedAt: pDoc?.completedAt || null
        };
      });

      return {
        enrollmentId: enrollment._id,
        courseId,
        courseName: enrollment.courseId.title,
        thumbnailUrl: enrollment.courseId.thumbnailUrl,
        enrollmentDate: enrollment.startDate,
        progress: enrollment.progress?.percentComplete || 0,
        status: enrollment.status,
        completedLessonsCount: enrollment.progress?.completedLessons?.length || 0,
        totalLessons: lessons.length,
        timeSpent: Math.round(timeSpentSeconds / 60),
        certificateStatus: enrollment.certificateIssued ? 'Issued' : 'Pending',
        certificateId: enrollment.certificateId,
        currentLesson: currentLesson?.title || 'N/A',
        lastCompletedLesson: lastCompletedLesson?.title || 'N/A',
        timeline
      };
    }));

    const quizzes = await QuizResult.find({ studentId: id }).populate('quizId', 'title').lean();
    const assignments = await Submission.find({ studentId: id }).populate('assignmentId', 'title').lean();

    res.status(200).json({
      success: true,
      data: {
        profile: student,
        courses: coursesAnalytics.filter(c => c !== null),
        quizzes,
        assignments
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const adminResetProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, courseId } = req.params;
    await mongoose.model('Progress').deleteMany({ userId: id, courseId });
    await Enrollment.findOneAndUpdate({ studentId: id, courseId }, {
      $set: {
        'progress.completedLessons': [],
        'progress.percentComplete': 0,
        certificateIssued: false,
        certificateId: null
      }
    });
    res.json({ success: true, message: 'Progress reset successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const adminMarkComplete = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, courseId } = req.params;
    const lessons = await Lesson.find({ courseId }).select('_id');
    const lessonIds = lessons.map(l => l._id);
    
    const enrollment = await Enrollment.findOneAndUpdate({ studentId: id, courseId }, {
      $set: {
        'progress.completedLessons': lessonIds,
        'progress.percentComplete': 100,
        status: 'completed'
      }
    }, { new: true }).populate('studentId').populate('courseId');

    if (enrollment && !enrollment.certificateIssued) {
      const { generateCertificateOffline } = require('../utils/certificateGenerator');
      const cert = await generateCertificateOffline(id, courseId);
      enrollment.certificateIssued = true;
      enrollment.certificateId = cert.certificateId;
      await enrollment.save();
    }

    res.json({ success: true, message: 'Course marked complete' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const adminUnlockAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, courseId } = req.params;
    const lessons = await Lesson.find({ courseId }).select('_id');
    const lessonIds = lessons.map(l => l._id);

    await Enrollment.findOneAndUpdate({ studentId: id, courseId }, {
      $addToSet: {
        'progress.completedLessons': { $each: lessonIds }
      }
    });

    res.json({ success: true, message: 'All lessons unlocked' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const adminRegenerateCertificate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, courseId } = req.params;
    const { generateCertificateOffline } = require('../utils/certificateGenerator');
    const cert = await generateCertificateOffline(id, courseId);
    
    await Enrollment.findOneAndUpdate({ studentId: id, courseId }, {
      $set: {
        certificateIssued: true,
        certificateId: cert.certificateId
      }
    });

    res.json({ success: true, message: 'Certificate regenerated', data: cert });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
