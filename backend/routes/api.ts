import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import {
  sendOTP,
  verifyOTPAndLogin,
  loginWithPassword,
  handleRefreshToken,
  updatePassword,
  logout,
  logoutFromAllDevices,
  getMe,
  getUsers,
} from '../controllers/authController';
import {
  getPlans,
  getAllPlansAdmin,
  createPlan,
  updatePlan,
  deletePlan,
} from '../controllers/planController';
import {
  razorpayWebhook,
  simulatePaymentWebhook,
} from '../controllers/paymentController';
import {
  submitOnboarding,
  getOnboardings,
  getOnboardingDetails,
  updateOnboarding,
  deleteOnboarding,
  rejectOnboarding,
  approveOnboarding,
  resendCredentials,
  syncGoogleSheets,
} from '../controllers/onboardingController';
import {
  getCourses,
  getCourseDetails,
  createCourse,
  updateCourse,
  duplicateCourse,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  trackLessonProgress,
} from '../controllers/courseController';
import {
  getLiveClasses,
  createLiveClass,
  joinLiveClass,
  updateLiveClass,
} from '../controllers/liveClassController';
import {
  createAssignment,
  getAssignments,
  submitAssignment,
  getSubmissionsForGrading,
  gradeSubmission,
} from '../controllers/assignmentController';
import {
  createQuiz,
  getQuizzes,
  submitQuizAnswers,
  getQuizLeaderboard,
} from '../controllers/quizController';
import {
  getStudentCertificates,
  verifyCertificate,
} from '../controllers/certificateController';
import {
  createTicket,
  getTickets,
  addMessageToTicket,
  updateTicketStatus,
} from '../controllers/ticketController';
import { syncGoogleSheetsOnboardings } from '../controllers/googleSheetsController';
import { postRuntimeError } from '../controllers/logController';
import {
  getSettings,
  updateSettings,
  getAdminStats,
  getStudentStats,
  getMentorStats,
  getAuditLogs,
  exportReport,
} from '../controllers/analyticsController';
import { protect, authorize, checkPlanFeature } from '../middleware/auth';

const router = Router();

// ==========================================
// 1. PUBLIC ROUTES & WEBHOOKS
// ==========================================
router.post('/auth/send-otp', sendOTP);
router.post('/auth/verify-otp', verifyOTPAndLogin);
router.post('/auth/login', loginWithPassword);
router.get('/auth/refresh', handleRefreshToken);
router.post('/payments/webhook', razorpayWebhook);
router.post('/payments/simulate-webhook', simulatePaymentWebhook);
router.get('/certificates/verify/:key', verifyCertificate);
router.get('/plans', getPlans);
router.get('/learning-plans', getPlans);
router.post('/onboarding', submitOnboarding);
router.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.status(200).json({
    success: true,
    status: 'healthy',
    database: dbStatus === 'Connected' ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

router.post('/logs/runtime-error', postRuntimeError);

router.post('/dev/reset-google-imports', async (req, res) => {
  const isDev = process.env.NODE_ENV === 'development' || process.env.ALLOW_REIMPORT_TEST_USERS === 'true';
  if (!isDev) {
    res.status(403).json({ success: false, message: 'Access denied: Development only endpoint.' });
    return;
  }

  try {
    const Onboarding = mongoose.model('Onboarding');
    const Enrollment = mongoose.model('Enrollment');
    const User = mongoose.model('User');

    const sheetsRequests = await Onboarding.find({
      $or: [
        { source: 'google-sheets' },
        { googleRowId: { $exists: true } }
      ]
    });
    const emails = sheetsRequests.map(r => r.email);

    const testUsers = await User.find({ email: { $in: emails }, role: 'Student' });
    const userIds = testUsers.map(u => u._id);

    await User.deleteMany({ _id: { $in: userIds } });
    await Enrollment.deleteMany({ studentId: { $in: userIds } });
    await Onboarding.deleteMany({ _id: { $in: sheetsRequests.map(r => r._id) } });

    res.status(200).json({
      success: true,
      message: `Reset complete. Deleted ${sheetsRequests.length} onboarding requests and ${testUsers.length} test student users.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. PROTECTED LOGGED IN USER ROUTES
// ==========================================
router.use(protect);

router.get('/auth/me', getMe);
router.get('/users', getUsers);
router.get('/auth/users', getUsers);
router.get('/batches', (req, res) => {
  res.status(200).json({
    success: true,
    data: [
      { _id: 'Batch A', name: 'Batch A (Weekdays morning)' },
      { _id: 'Batch B', name: 'Batch B (Weekdays evening)' },
      { _id: 'Batch C', name: 'Batch C (Weekends batch)' },
    ],
  });
});
router.post('/auth/logout', logout);
router.post('/auth/logout-all', logoutFromAllDevices);
router.put('/auth/update-password', updatePassword);

// Dashboards Analytics
router.get('/analytics/student', authorize('Student'), getStudentStats);
router.get('/analytics/mentor', authorize('Mentor'), getMentorStats);
router.get('/analytics/admin', authorize('SuperAdmin', 'Admin'), getAdminStats);

// Settings Check
router.get('/settings', getSettings);

// Tickets Messaging
router.post('/tickets', createTicket);
router.get('/tickets', getTickets);
router.post('/tickets/:id/messages', addMessageToTicket);

// Course Details & Progress Checks
router.get('/courses', getCourses);
router.get('/courses/:id', getCourseDetails);
router.post('/courses/track-progress', authorize('Student'), trackLessonProgress);

// Quiz Execution
router.get('/quizzes', getQuizzes);
router.post('/quizzes/submit', authorize('Student'), checkPlanFeature('quizzes'), submitQuizAnswers);
router.get('/quizzes/:quizId/leaderboard', getQuizLeaderboard);

// Assignments Submission
router.get('/assignments', getAssignments);
router.post('/assignments/submit', authorize('Student'), checkPlanFeature('assignments'), submitAssignment);

// Certifications
router.get('/certificates/student', authorize('Student'), getStudentCertificates);

// Live Classes joining
router.get('/live-classes', getLiveClasses);
router.post('/live-classes/:id/join', authorize('Student'), checkPlanFeature('liveClasses'), joinLiveClass);

// ==========================================
// 3. MENTOR & INSTRUCTOR ROUTES
// ==========================================
router.post('/live-classes', authorize('Mentor', 'Admin', 'SuperAdmin'), createLiveClass);
router.put('/live-classes/:id', authorize('Mentor', 'Admin', 'SuperAdmin'), updateLiveClass);
router.get('/assignments/submissions', authorize('Mentor', 'Admin', 'SuperAdmin'), getSubmissionsForGrading);
router.put('/assignments/submissions/:id/grade', authorize('Mentor', 'Admin', 'SuperAdmin'), gradeSubmission);

// ==========================================
// 4. ADMIN & MANAGEMENT ROUTES
// ==========================================
router.use(authorize('SuperAdmin', 'Admin'));

// Onboarding Management Operations
router.get('/onboarding', getOnboardings);
router.post('/onboarding/sync', syncGoogleSheets);
router.post('/google/sync', syncGoogleSheetsOnboardings);
router.get('/onboarding/:id', getOnboardingDetails);
router.put('/onboarding/:id', updateOnboarding);
router.delete('/onboarding/:id', deleteOnboarding);
router.post('/onboarding/:id/approve', approveOnboarding);
router.post('/onboarding/:id/reject', rejectOnboarding);
router.post('/users/:id/resend-credentials', resendCredentials);

// System Settings Edits
router.put('/settings', updateSettings);
router.get('/analytics/audit-logs', getAuditLogs);
router.get('/analytics/export', exportReport);

// Support status resolving
router.put('/tickets/:id/status', updateTicketStatus);

// Learning Plans Operations
router.get('/plans/admin', getAllPlansAdmin);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

// Course Management CRUDs
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.post('/courses/:id/duplicate', duplicateCourse);

// Modules CRUD
router.post('/modules', createModule);
router.put('/modules/:id', updateModule);
router.delete('/modules/:id', deleteModule);

// Lessons CRUD
router.post('/lessons', createLesson);
router.put('/lessons/:id', updateLesson);
router.delete('/lessons/:id', deleteLesson);

// Quiz Scheduling
router.post('/quizzes', createQuiz);

// User/Student Administration
router.get('/users/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password');
    res.json({ success: true, data: students });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router.get('/users/mentors', async (req, res) => {
  try {
    const mentors = await User.find({ role: 'mentor' }).select('-password');
    res.json({ success: true, data: mentors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router.post('/users/create-admin-mentor', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ success: false, message: 'Name, email, password, and role are required' });
    return;
  }
  try {
    const user = new User({ name, email, password, role, isEmailVerified: true });
    await user.save();
    res.status(201).json({ success: true, message: 'Account created', data: { name, email, role } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
