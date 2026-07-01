"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_1 = __importDefault(require("../models/User"));
const authController_1 = require("../controllers/authController");
const planController_1 = require("../controllers/planController");
const paymentController_1 = require("../controllers/paymentController");
const courseController_1 = require("../controllers/courseController");
const liveClassController_1 = require("../controllers/liveClassController");
const assignmentController_1 = require("../controllers/assignmentController");
const quizController_1 = require("../controllers/quizController");
const certificateController_1 = require("../controllers/certificateController");
const ticketController_1 = require("../controllers/ticketController");
const analyticsController_1 = require("../controllers/analyticsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ==========================================
// 1. PUBLIC ROUTES & WEBHOOKS
// ==========================================
router.post('/auth/send-otp', authController_1.sendOTP);
router.post('/auth/verify-otp', authController_1.verifyOTPAndLogin);
router.post('/auth/login', authController_1.loginWithPassword);
router.get('/auth/refresh', authController_1.handleRefreshToken);
router.post('/payments/webhook', paymentController_1.razorpayWebhook);
router.post('/payments/simulate-webhook', paymentController_1.simulatePaymentWebhook);
router.get('/certificates/verify/:key', certificateController_1.verifyCertificate);
router.get('/plans', planController_1.getPlans);
// ==========================================
// 2. PROTECTED LOGGED IN USER ROUTES
// ==========================================
router.use(auth_1.protect);
router.get('/auth/me', authController_1.getMe);
router.post('/auth/logout', authController_1.logout);
router.post('/auth/logout-all', authController_1.logoutFromAllDevices);
router.put('/auth/update-password', authController_1.updatePassword);
// Dashboards Analytics
router.get('/analytics/student', (0, auth_1.authorize)('student'), analyticsController_1.getStudentStats);
router.get('/analytics/mentor', (0, auth_1.authorize)('mentor'), analyticsController_1.getMentorStats);
router.get('/analytics/admin', (0, auth_1.authorize)('super-admin', 'admin'), analyticsController_1.getAdminStats);
// Settings Check
router.get('/settings', analyticsController_1.getSettings);
// Tickets Messaging
router.post('/tickets', ticketController_1.createTicket);
router.get('/tickets', ticketController_1.getTickets);
router.post('/tickets/:id/messages', ticketController_1.addMessageToTicket);
// Course Details & Progress Checks
router.get('/courses', courseController_1.getCourses);
router.get('/courses/:id', courseController_1.getCourseDetails);
router.post('/courses/track-progress', (0, auth_1.authorize)('student'), courseController_1.trackLessonProgress);
// Quiz Execution
router.get('/quizzes', quizController_1.getQuizzes);
router.post('/quizzes/submit', (0, auth_1.authorize)('student'), (0, auth_1.checkPlanFeature)('quizzes'), quizController_1.submitQuizAnswers);
router.get('/quizzes/:quizId/leaderboard', quizController_1.getQuizLeaderboard);
// Assignments Submission
router.get('/assignments', assignmentController_1.getAssignments);
router.post('/assignments/submit', (0, auth_1.authorize)('student'), (0, auth_1.checkPlanFeature)('assignments'), assignmentController_1.submitAssignment);
// Certifications
router.get('/certificates/student', (0, auth_1.authorize)('student'), certificateController_1.getStudentCertificates);
// Live Classes joining
router.get('/live-classes', liveClassController_1.getLiveClasses);
router.post('/live-classes/:id/join', (0, auth_1.authorize)('student'), (0, auth_1.checkPlanFeature)('liveClasses'), liveClassController_1.joinLiveClass);
// ==========================================
// 3. MENTOR & INSTRUCTOR ROUTES
// ==========================================
router.post('/live-classes', (0, auth_1.authorize)('mentor', 'admin', 'super-admin'), liveClassController_1.createLiveClass);
router.put('/live-classes/:id', (0, auth_1.authorize)('mentor', 'admin', 'super-admin'), liveClassController_1.updateLiveClass);
router.get('/assignments/submissions', (0, auth_1.authorize)('mentor', 'admin', 'super-admin'), assignmentController_1.getSubmissionsForGrading);
router.put('/assignments/submissions/:id/grade', (0, auth_1.authorize)('mentor', 'admin', 'super-admin'), assignmentController_1.gradeSubmission);
// ==========================================
// 4. ADMIN & MANAGEMENT ROUTES
// ==========================================
router.use((0, auth_1.authorize)('super-admin', 'admin'));
// System Settings Edits
router.put('/settings', analyticsController_1.updateSettings);
router.get('/analytics/audit-logs', analyticsController_1.getAuditLogs);
router.get('/analytics/export', analyticsController_1.exportReport);
// Support status resolving
router.put('/tickets/:id/status', ticketController_1.updateTicketStatus);
// Learning Plans Operations
router.get('/plans/admin', planController_1.getAllPlansAdmin);
router.post('/plans', planController_1.createPlan);
router.put('/plans/:id', planController_1.updatePlan);
router.delete('/plans/:id', planController_1.deletePlan);
// Course Management CRUDs
router.post('/courses', courseController_1.createCourse);
router.put('/courses/:id', courseController_1.updateCourse);
router.post('/courses/:id/duplicate', courseController_1.duplicateCourse);
// Modules CRUD
router.post('/modules', courseController_1.createModule);
router.put('/modules/:id', courseController_1.updateModule);
router.delete('/modules/:id', courseController_1.deleteModule);
// Lessons CRUD
router.post('/lessons', courseController_1.createLesson);
router.put('/lessons/:id', courseController_1.updateLesson);
router.delete('/lessons/:id', courseController_1.deleteLesson);
// Quiz Scheduling
router.post('/quizzes', quizController_1.createQuiz);
// User/Student Administration
router.get('/users/students', async (req, res) => {
    try {
        const students = await User_1.default.find({ role: 'student' }).select('-password');
        res.json({ success: true, data: students });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/users/mentors', async (req, res) => {
    try {
        const mentors = await User_1.default.find({ role: 'mentor' }).select('-password');
        res.json({ success: true, data: mentors });
    }
    catch (error) {
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
        const user = new User_1.default({ name, email, password, role, isEmailVerified: true });
        await user.save();
        res.status(201).json({ success: true, message: 'Account created', data: { name, email, role } });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
exports.default = router;
