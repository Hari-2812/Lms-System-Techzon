"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportReport = exports.getMentorStats = exports.getStudentStats = exports.getAdminStats = exports.getAuditLogs = exports.updateSettings = exports.getSettings = exports.seedDefaultSettings = void 0;
const User_1 = __importDefault(require("../models/User"));
const Course_1 = __importDefault(require("../models/Course"));
const Enrollment_1 = __importDefault(require("../models/Enrollment"));
const LiveClass_1 = __importDefault(require("../models/LiveClass"));
const SupportTicket_1 = __importDefault(require("../models/SupportTicket"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const Settings_1 = __importDefault(require("../models/Settings"));
const Submission_1 = __importDefault(require("../models/Submission"));
const QuizResult_1 = __importDefault(require("../models/QuizResult"));
const Onboarding_1 = __importDefault(require("../models/Onboarding"));
const logger_1 = __importDefault(require("../config/logger"));
// Seed default settings if they do not exist
const seedDefaultSettings = async () => {
    const count = await Settings_1.default.countDocuments();
    if (count > 0)
        return;
    const defaultSettings = new Settings_1.default({
        appName: 'Techzon LMS System',
        companyName: 'Techzon Wide',
        supportEmail: 'support@techzonwide.com',
        supportNumber: '+91 6374191654',
        maintenanceMode: false,
    });
    await defaultSettings.save();
    logger_1.default.info('Default System Settings seeded successfully.');
};
exports.seedDefaultSettings = seedDefaultSettings;
const getSettings = async (req, res) => {
    try {
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = new Settings_1.default({
                appName: 'Techzon LMS System',
                companyName: 'Techzon Wide',
                supportEmail: 'support@techzonwide.com',
                supportNumber: '+91 6374191654',
            });
            await settings.save();
        }
        res.status(200).json({ success: true, data: settings });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    try {
        const settings = await Settings_1.default.findOneAndUpdate({}, req.body, {
            new: true,
            upsert: true,
            runValidators: true,
        });
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'UPDATE_SETTINGS',
            details: 'Updated global system settings.',
        });
        res.status(200).json({ success: true, data: settings });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.updateSettings = updateSettings;
const getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog_1.default.find()
            .populate('userId', 'name email role')
            .sort('-createdAt')
            .limit(100);
        res.status(200).json({ success: true, data: logs });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getAuditLogs = getAuditLogs;
// Admin Dashboard Analytics
const getAdminStats = async (req, res) => {
    try {
        const totalStudents = await User_1.default.countDocuments({ role: 'student' });
        const totalMentors = await User_1.default.countDocuments({ role: 'mentor' });
        const totalCourses = await Course_1.default.countDocuments();
        const activeEnrollments = await Enrollment_1.default.countDocuments({ status: 'active' });
        // Onboarding summation instead of payments
        const pendingOnboardingRequests = await Onboarding_1.default.countDocuments({ status: 'pending' });
        const totalOnboardingRequests = await Onboarding_1.default.countDocuments();
        const pendingTickets = await SupportTicket_1.default.countDocuments({ status: { $ne: 'closed' } });
        // Recent Onboarding Requests instead of payments
        const recentOnboardings = await Onboarding_1.default.find()
            .populate('courses', 'title')
            .populate('learningPlan', 'name')
            .sort('-createdAt')
            .limit(5);
        // Recent Activity Logs
        const recentAuditLogs = await AuditLog_1.default.find()
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getAdminStats = getAdminStats;
// Student Dashboard Analytics
const getStudentStats = async (req, res) => {
    try {
        const studentId = req.user._id;
        const enrollments = await Enrollment_1.default.find({ studentId }).populate('courseId', 'title category thumbnailUrl');
        const coursesCount = enrollments.length;
        if (coursesCount === 0) {
            res.status(403).json({
                success: false,
                message: 'Your LMS access has not been activated. Please contact Techzon Wide Support.',
            });
            return;
        }
        // Completed courses count (percentComplete === 100)
        const completedCoursesCount = enrollments.filter((e) => e.progress?.percentComplete === 100).length;
        // Completed quiz count
        const quizAttempts = await QuizResult_1.default.countDocuments({ studentId });
        const passedQuizzes = await QuizResult_1.default.countDocuments({ studentId, passed: true });
        // Completed assignment submissions
        const assignmentSubmissions = await Submission_1.default.countDocuments({ studentId });
        // Pending support tickets
        const supportTickets = await SupportTicket_1.default.find({ studentId }).sort('-createdAt');
        // Upcoming Live Classes (scheduled check)
        const liveClasses = await LiveClass_1.default.find({ status: 'scheduled' })
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getStudentStats = getStudentStats;
// Mentor Dashboard Analytics
const getMentorStats = async (req, res) => {
    try {
        const mentorId = req.user._id;
        // Find courses where mentor is assigned
        const courses = await Course_1.default.find({ mentors: mentorId });
        const courseIds = courses.map((c) => c._id);
        // Number of students enrolled in mentor's courses
        const studentEnrollments = await Enrollment_1.default.countDocuments({
            courseId: { $in: courseIds },
            status: 'active',
        });
        // Scheduled classes count
        const liveClassesScheduled = await LiveClass_1.default.countDocuments({
            mentorId,
            status: 'scheduled',
        });
        // Submissions pending grading
        const submissions = await Submission_1.default.find()
            .populate('assignmentId')
            .populate('studentId', 'name email');
        // Filter submissions belonging to mentor's assigned courses
        const pendingGradingSubmissions = submissions.filter((sub) => {
            return (sub.status === 'submitted' &&
                sub.assignmentId &&
                courseIds.some((cid) => cid.toString() === sub.assignmentId.courseId.toString()));
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getMentorStats = getMentorStats;
// Export Reports as CSV
const exportReport = async (req, res) => {
    const { type } = req.query; // 'payments', 'enrollments', 'students'
    try {
        let csvData = '';
        if (type === 'onboardings') {
            const onboardings = await Onboarding_1.default.find().populate('courses', 'title').populate('learningPlan', 'name');
            csvData = 'Student Name,Student Email,Phone,College,Degree,City,State,Courses,Plan,Status,Date\n';
            onboardings.forEach((o) => {
                const courseTitles = o.courses ? o.courses.map((c) => c.title).join(' | ') : '';
                csvData += `"${o.fullName}","${o.email}","${o.phone}","${o.college}","${o.degree}","${o.city}","${o.state}","${courseTitles}","${o.learningPlan?.name || ''}","${o.status}","${o.createdAt.toISOString()}"\n`;
            });
            res.setHeader('Content-Type', 'text/csv');
            res.attachment('onboarding_requests_report.csv');
            res.status(200).send(csvData);
            return;
        }
        if (type === 'enrollments') {
            const enrollments = await Enrollment_1.default.find()
                .populate('studentId', 'name email')
                .populate('courseId', 'title')
                .populate('learningPlanId', 'name');
            csvData = 'Student Name,Student Email,Course,Plan,Progress,Status,Expiry Date\n';
            enrollments.forEach((e) => {
                csvData += `"${e.studentId?.name || 'Deleted'}","${e.studentId?.email || ''}","${e.courseId?.title || ''}","${e.learningPlanId?.name || ''}",${e.progress?.percentComplete || 0},"${e.status}","${e.expiryDate.toISOString()}"\n`;
            });
            res.setHeader('Content-Type', 'text/csv');
            res.attachment('enrollments_report.csv');
            res.status(200).send(csvData);
            return;
        }
        res.status(400).json({ success: false, message: 'Invalid or missing report type. Use type=onboardings or type=enrollments.' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.exportReport = exportReport;
