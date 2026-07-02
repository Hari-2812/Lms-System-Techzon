"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveOnboarding = exports.rejectOnboarding = exports.deleteOnboarding = exports.updateOnboarding = exports.getOnboardingDetails = exports.getOnboardings = exports.submitOnboarding = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Onboarding_1 = __importDefault(require("../models/Onboarding"));
const User_1 = __importDefault(require("../models/User"));
const Enrollment_1 = __importDefault(require("../models/Enrollment"));
const LearningPlan_1 = __importDefault(require("../models/LearningPlan"));
const Course_1 = __importDefault(require("../models/Course"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const email_1 = require("../services/email");
const logger_1 = __importDefault(require("../config/logger"));
// Helper to generate a random temporary password
const generateTempPassword = () => {
    return crypto_1.default.randomBytes(6).toString('hex');
};
// 1. Submit Onboarding Request (PUBLIC)
const submitOnboarding = async (req, res) => {
    const { fullName, email, phone, college, degree, city, state, courses, learningPlan, preferredBatch, preferredMentor } = req.body;
    if (!fullName || !email || !phone || !college || !degree || !city || !state || !courses || !learningPlan) {
        res.status(400).json({ success: false, message: 'All registration details are required' });
        return;
    }
    try {
        const onboarding = new Onboarding_1.default({
            fullName,
            email: email.toLowerCase(),
            phone,
            college,
            degree,
            city,
            state,
            courses,
            learningPlan,
            preferredBatch,
            preferredMentor: preferredMentor || undefined,
            status: 'pending',
        });
        await onboarding.save();
        logger_1.default.info(`New student onboarding request submitted from: ${email}`);
        res.status(201).json({ success: true, message: 'Your onboarding application has been submitted successfully!', data: onboarding });
    }
    catch (error) {
        logger_1.default.error('Error submitting onboarding request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.submitOnboarding = submitOnboarding;
// 2. Get Onboarding Requests (ADMIN)
const getOnboardings = async (req, res) => {
    const { status } = req.query;
    const filter = {};
    if (status)
        filter.status = status;
    try {
        const requests = await Onboarding_1.default.find(filter)
            .populate('courses', 'title')
            .populate('learningPlan', 'name')
            .populate('preferredMentor', 'name')
            .sort('-createdAt');
        res.status(200).json({ success: true, data: requests });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getOnboardings = getOnboardings;
// 3. Get Single Onboarding Details (ADMIN)
const getOnboardingDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const request = await Onboarding_1.default.findById(id)
            .populate('courses', 'title category')
            .populate('learningPlan', 'name price durationMonths features')
            .populate('preferredMentor', 'name email');
        if (!request) {
            res.status(404).json({ success: false, message: 'Onboarding request not found' });
            return;
        }
        res.status(200).json({ success: true, data: request });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getOnboardingDetails = getOnboardingDetails;
// 4. Update Onboarding Request Details (ADMIN)
const updateOnboarding = async (req, res) => {
    const { id } = req.params;
    try {
        const request = await Onboarding_1.default.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!request) {
            res.status(404).json({ success: false, message: 'Onboarding request not found' });
            return;
        }
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'UPDATE_ONBOARDING',
            details: `Updated onboarding application: ${request.fullName} (${request.email})`,
        });
        res.status(200).json({ success: true, data: request });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.updateOnboarding = updateOnboarding;
// 5. Delete Onboarding Request (ADMIN)
const deleteOnboarding = async (req, res) => {
    const { id } = req.params;
    try {
        const request = await Onboarding_1.default.findByIdAndDelete(id);
        if (!request) {
            res.status(404).json({ success: false, message: 'Onboarding request not found' });
            return;
        }
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'DELETE_ONBOARDING',
            details: `Deleted onboarding application: ${request.fullName} (${request.email})`,
        });
        res.status(200).json({ success: true, message: 'Onboarding request deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.deleteOnboarding = deleteOnboarding;
// 6. Reject Onboarding Request (ADMIN)
const rejectOnboarding = async (req, res) => {
    const { id } = req.params;
    const { remarks } = req.body;
    try {
        const request = await Onboarding_1.default.findByIdAndUpdate(id, { status: 'rejected', remarks, approvedBy: req.user._id, approvedAt: new Date() }, { new: true });
        if (!request) {
            res.status(404).json({ success: false, message: 'Onboarding request not found' });
            return;
        }
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'REJECT_ONBOARDING',
            details: `Rejected onboarding request: ${request.fullName}. Reason: ${remarks || 'No remarks provided'}`,
        });
        res.status(200).json({ success: true, data: request });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.rejectOnboarding = rejectOnboarding;
// 7. Approve Onboarding Request & Provision Account (ADMIN)
const approveOnboarding = async (req, res) => {
    const { id } = req.params;
    const { courses, learningPlan, batch, mentorId, durationMonths, remarks } = req.body;
    try {
        const request = await Onboarding_1.default.findById(id);
        if (!request) {
            res.status(404).json({ success: false, message: 'Onboarding request not found' });
            return;
        }
        if (request.status === 'approved') {
            res.status(400).json({ success: false, message: 'This onboarding request has already been approved.' });
            return;
        }
        // Capture values from body or fall back to request defaults
        const finalCourseIds = courses || request.courses;
        const finalPlanId = learningPlan || request.learningPlan;
        const finalBatch = batch || request.preferredBatch || 'Batch A';
        const finalMentorId = mentorId || request.preferredMentor;
        const plan = await LearningPlan_1.default.findById(finalPlanId);
        if (!plan) {
            res.status(400).json({ success: false, message: 'Invalid or missing learning plan selected.' });
            return;
        }
        // 1. Provision User Account
        let user = await User_1.default.findOne({ email: request.email.toLowerCase() });
        let tempPassword = '';
        if (!user) {
            tempPassword = generateTempPassword();
            user = new User_1.default({
                name: request.fullName,
                email: request.email.toLowerCase(),
                password: tempPassword,
                role: 'Student',
                status: 'active',
                isEmailVerified: true,
            });
            await user.save();
            logger_1.default.info(`Onboarding approval spawned new student user: ${request.email}`);
        }
        else {
            // Ensure user profile status is active
            if (user.status !== 'active') {
                user.status = 'active';
                await user.save();
            }
        }
        // 2. Spawning Enrollments (spawns one enrollment per selected course)
        const startDate = new Date();
        const expiryDate = new Date();
        const activeDuration = durationMonths || plan.durationMonths || 6;
        expiryDate.setMonth(startDate.getMonth() + activeDuration);
        const enrollmentResults = [];
        for (const courseId of finalCourseIds) {
            const dbCourse = await Course_1.default.findById(courseId);
            if (!dbCourse)
                continue;
            // Spawns/updates course enrollment
            const enrollment = await Enrollment_1.default.findOneAndUpdate({ studentId: user._id, courseId: dbCourse._id }, {
                learningPlanId: plan._id,
                batch: finalBatch,
                mentorId: finalMentorId || undefined,
                createdBy: req.user._id,
                startDate,
                expiryDate,
                status: 'active',
                progress: { completedLessons: [], percentComplete: 0 },
            }, { upsert: true, new: true });
            enrollmentResults.push(enrollment);
        }
        // 3. Mark Onboarding Request as Approved
        request.status = 'approved';
        request.remarks = remarks;
        request.approvedBy = req.user._id;
        request.approvedAt = new Date();
        await request.save();
        // 4. Send Welcome Email Credentials
        await (0, email_1.sendWelcomeEmail)(request.email, request.fullName, tempPassword || undefined);
        // 5. Audit Logging
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'APPROVE_ONBOARDING',
            details: `Approved onboarding ID ${request._id} for ${request.fullName}. Spawned ${enrollmentResults.length} enrollments.`,
        });
        res.status(200).json({
            success: true,
            message: 'Onboarding approved successfully. Student access provisioned!',
            data: {
                user: { id: user._id, name: user.name, email: user.email },
                enrollments: enrollmentResults,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error during onboarding approval:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.approveOnboarding = approveOnboarding;
