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
import Progress from '../models/Progress';
import Submission from '../models/Submission';
import QuizResult from '../models/QuizResult';

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

    const duplicateOnboardingsRemoved = 0;

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
    // Test onboarding cleanup removed
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
      details: `Cleared development test records: duplicate users ${duplicateUsersRemoved}, duplicate onboardings ${duplicateOnboardingsRemoved}, duplicate enrollments ${duplicateEnrollmentsRemoved}, duplicate notifications ${duplicateNotificationsRemoved}, test users ${testUsersDeleted}, test notifications ${testNotificationsDeleted}`,
    });

    res.status(200).json({
      success: true,
      data: {
        duplicateUsersRemoved,
        duplicateOnboardingsRemoved,
        duplicateEnrollmentsRemoved,
        duplicateNotificationsRemoved,
        testUsersDeleted,
        testOnboardingsDeleted: 0,
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

    const pendingOnboardingRequests = 0;
    const totalOnboardingRequests = 0;

    const pendingTickets = await SupportTicket.countDocuments({ status: { $ne: 'closed' } });

    // Recent Onboarding Requests instead of payments
    const recentOnboardings: any[] = [];

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

    const enrollments = await Enrollment.find({ studentId, status: 'active' }).populate('courseId', 'title category thumbnailUrl');
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
      
      const existingLessonIds = allLessons.map(l => l._id.toString());
      const completedIds = (e.progress?.completedLessons || [])
        .map((id: any) => id.toString())
        .filter((id: string) => existingLessonIds.includes(id));
        
      const lessonsCompleted = completedIds.length;
      const remainingLessons = totalLessons - lessonsCompleted;
      const dynamicPercentComplete = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;
      
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
        progress: {
           ...(eObj.progress || {}),
           percentComplete: dynamicPercentComplete,
           completedLessons: completedIds
        },
        lessonsCompleted,
        remainingLessons,
        currentLesson,
        nextLesson,
        totalLessons
      };
    }));

    // Completed courses count (dynamically calculated percentComplete === 100)
    const completedCoursesCount = enhancedEnrollments.filter((e) => e.progress?.percentComplete === 100).length;

    // Completed quiz count
    const quizAttempts = await QuizResult.countDocuments({ studentId });
    const passedQuizzes = await QuizResult.countDocuments({ studentId, passed: true });

    // Completed assignment submissions
    const assignmentSubmissions = await Submission.countDocuments({ studentId });

    // Pending support tickets
    const supportTickets = await SupportTicket.find({ studentId }).sort('-createdAt');

    // Upcoming Live Classes (scheduled check)
    const courseIds = enrollments.map((e) => e.courseId);
    const liveClasses = await LiveClass.find({ status: 'scheduled', courseId: { $in: courseIds } })
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
      res.status(400).json({ success: false, message: 'Onboarding exports are no longer supported here.' });
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

import { getRegisteredStudentsForDirectory } from '../services/studentService';

export const getAdminStudentsList = async (req: Request, res: Response): Promise<void> => {
  try {
    const students = await getRegisteredStudentsForDirectory();

    // Fetch all lessons to compute dynamic progress accurately
    const allLessons = await Lesson.find({}, '_id courseId').lean();
    const courseLessonMap = new Map<string, string[]>();
    for (const lesson of allLessons) {
      const courseIdStr = lesson.courseId.toString();
      if (!courseLessonMap.has(courseIdStr)) {
        courseLessonMap.set(courseIdStr, []);
      }
      courseLessonMap.get(courseIdStr)!.push(lesson._id.toString());
    }

    // Fetch all completion records from the Progress collection
    const allProgressRecords = await mongoose.model('Progress').find({ completed: true }, 'userId lessonId').lean() as { userId: any; lessonId: any }[];
    const userCompletedLessons = new Map<string, Set<string>>();
    for (const p of allProgressRecords) {
      const userIdStr = p.userId.toString();
      const lessonIdStr = p.lessonId.toString();
      if (!userCompletedLessons.has(userIdStr)) {
        userCompletedLessons.set(userIdStr, new Set());
      }
      userCompletedLessons.get(userIdStr)!.add(lessonIdStr);
    }

    const studentsWithAnalytics = await Promise.all(
      students.map(async (student) => {
        const enrollments = await Enrollment.find({ studentId: student._id, status: 'active' }).populate('courseId', 'title').lean();
        const payments = await Payment.find({ studentEmail: student.email, status: 'captured' }).lean();
        
        let overallProgress = 0;
        let lastActive: Date | string = 'Never';
        let currentCourse = 'N/A';
        let batch = 'N/A';
        let paidCourseCount = new Set(payments.map(p => p.courseId?.toString())).size;
        const validEnrollments = enrollments.filter(e => e.courseId != null);
        let activeEnrollmentCount = validEnrollments.filter(e => e.status === 'active').length;
        let incorrectAccess = 0;

        if (validEnrollments.length > 0) {
          let totalLessonsAcrossCourses = 0;
          let totalCompletedAcrossCourses = 0;

          const completedSet = userCompletedLessons.get(student._id.toString()) || new Set();

          for (const e of validEnrollments) {
            const courseIdStr = (e.courseId as any)?._id?.toString() || e.courseId?.toString();
            const validLessonIds = courseLessonMap.get(courseIdStr) || [];
            const totalValidLessonsCount = validLessonIds.length;
            
            if (totalValidLessonsCount > 0) {
               totalLessonsAcrossCourses += totalValidLessonsCount;
               
               let validCompletedCount = 0;
               for (const id of validLessonIds) {
                 if (completedSet.has(id)) {
                   validCompletedCount++;
                 }
               }
               totalCompletedAcrossCourses += validCompletedCount;
            }
          }

          if (totalLessonsAcrossCourses > 0) {
            overallProgress = Math.min(Math.round((totalCompletedAcrossCourses / totalLessonsAcrossCourses) * 100), 100);
          } else {
            overallProgress = 0;
          }
          
          const sorted = [...validEnrollments].sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          currentCourse = (sorted[0].courseId as any)?.title || 'N/A';
          batch = sorted[0].batch || 'N/A';

          // calculate incorrect access
          const paidCourseIds = new Set(payments.map(p => p.courseId?.toString()));
          incorrectAccess = validEnrollments.filter(e => e.status === 'active' && !paidCourseIds.has((e.courseId as any)?._id?.toString())).length;
        }

        const lastProgress = await mongoose.model('Progress').findOne({ userId: student._id }).sort({ lastWatched: -1 }).lean() as any;
        if (lastProgress && lastProgress.lastWatched) {
          lastActive = lastProgress.lastWatched;
        }

        return {
          ...student,
          enrolledCourses: validEnrollments.map((e) => (e.courseId as any)?._id || e.courseId),
          enrolledCourseCount: validEnrollments.length,
          activeEnrollmentCount,
          paidCourseCount,
          incorrectAccess,
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid Student ID format' });
      return;
    }

    const student = await User.findById(id).select('-password').lean();
    
    if (!student || student.role !== 'Student') {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }


    const enrollments = await Enrollment.find({ studentId: id, status: 'active' })
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

      const existingLessonIds = lessons.map(l => l._id.toString());
      // Deduplicate completedLessons before filtering
      const completedSet = new Set((enrollment.progress?.completedLessons || []).map((cl: any) => cl.toString()));
      const validCompletedLessons = Array.from(completedSet).filter((cl: string) => existingLessonIds.includes(cl));
      const completedLessonsCount = validCompletedLessons.length;
      const totalLessons = lessons.length;
      const progress = totalLessons > 0 ? Math.min(Math.round((completedLessonsCount / totalLessons) * 100), 100) : 0;

      return {
        enrollmentId: enrollment._id,
        courseId,
        courseName: enrollment.courseId.title,
        thumbnailUrl: enrollment.courseId.thumbnailUrl,
        enrollmentDate: enrollment.startDate,
        progress,
        status: progress === 100 ? 'completed' : 'active',
        completedLessonsCount,
        totalLessons,
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

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ success: false, message: 'Invalid ID format' });
      return;
    }
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

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ success: false, message: 'Invalid ID format' });
      return;
    }
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

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ success: false, message: 'Invalid ID format' });
      return;
    }
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

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ success: false, message: 'Invalid ID format' });
      return;
    }
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
