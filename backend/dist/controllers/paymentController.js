"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulatePaymentWebhook = exports.razorpayWebhook = exports.processEnrollment = void 0;
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
const Course_1 = __importDefault(require("../models/Course"));
const LearningPlan_1 = __importDefault(require("../models/LearningPlan"));
const Enrollment_1 = __importDefault(require("../models/Enrollment"));
const Payment_1 = __importDefault(require("../models/Payment"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const email_1 = require("../services/email");
const logger_1 = __importDefault(require("../config/logger"));
// Helper to generate a random temporary password
const generateTempPassword = () => {
    return crypto_1.default.randomBytes(6).toString('hex');
};
// Process successful payment, provision account and enrollment
const processEnrollment = async (email, name, courseIdOrSlug, planCodeOrSlug, paymentDetails) => {
    try {
        // 1. Fetch Course and Learning Plan
        let course = await Course_1.default.findById(courseIdOrSlug);
        if (!course) {
            course = await Course_1.default.findOne({ slug: courseIdOrSlug.toLowerCase() });
        }
        let plan = await LearningPlan_1.default.findOne({ code: planCodeOrSlug.toLowerCase() });
        if (!plan) {
            plan = await LearningPlan_1.default.findById(planCodeOrSlug);
        }
        if (!course || !plan) {
            throw new Error(`Invalid course (${courseIdOrSlug}) or plan (${planCodeOrSlug})`);
        }
        // 2. Create User if not existing
        let user = await User_1.default.findOne({ email: email.toLowerCase() });
        let tempPassword = '';
        if (!user) {
            tempPassword = generateTempPassword();
            user = new User_1.default({
                name,
                email: email.toLowerCase(),
                password: tempPassword,
                role: 'student',
                status: 'active',
                isEmailVerified: true,
            });
            await user.save();
            logger_1.default.info(`Automated student account created for email: ${email}`);
        }
        // 3. Create/Update Enrollment
        const startDate = new Date();
        const expiryDate = new Date();
        expiryDate.setMonth(startDate.getMonth() + plan.durationMonths);
        // Update if student is already enrolled or create new
        const enrollment = await Enrollment_1.default.findOneAndUpdate({ studentId: user._id, courseId: course._id }, {
            learningPlanId: plan._id,
            startDate,
            expiryDate,
            status: 'active',
            progress: { completedLessons: [], percentComplete: 0 },
        }, { upsert: true, new: true });
        // 4. Record Payment
        const payment = new Payment_1.default({
            paymentId: paymentDetails.paymentId,
            orderId: paymentDetails.orderId,
            signature: paymentDetails.signature,
            studentEmail: email.toLowerCase(),
            studentName: name,
            courseId: course._id,
            learningPlanId: plan._id,
            amount: paymentDetails.amount,
            status: 'captured',
            transactionDate: new Date(),
        });
        await payment.save();
        // 5. Send Welcome Email
        await (0, email_1.sendWelcomeEmail)(email, name, tempPassword || undefined);
        // 6. Log activity
        await AuditLog_1.default.create({
            userId: user._id,
            action: 'ENROLLMENT_AUTOMATION',
            details: `User enrolled in course: ${course.title} via plan: ${plan.name}. Payment ID: ${paymentDetails.paymentId}`,
        });
        logger_1.default.info(`Enrollment successfully verified and activated for ${email} in course ${course.title}`);
        return { user, enrollment, payment };
    }
    catch (error) {
        logger_1.default.error('Error processing auto-enrollment in webhook:', error);
        throw error;
    }
};
exports.processEnrollment = processEnrollment;
// Razorpay Webhook Handler
const razorpayWebhook = async (req, res) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'yourwebhooksecret';
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
        res.status(400).json({ success: false, message: 'Signature missing' });
        return;
    }
    // Verify signature
    const shasum = crypto_1.default.createHmac('sha256', webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');
    if (digest !== signature) {
        logger_1.default.warn('Invalid Razorpay signature matching failed.');
        res.status(400).json({ success: false, message: 'Invalid signature match' });
        return;
    }
    const event = req.body.event;
    logger_1.default.info(`Razorpay Webhook Event Received: ${event}`);
    if (event === 'payment.captured') {
        const paymentEntity = req.body.payload.payment.entity;
        const amount = paymentEntity.amount / 100; // converted to main currency unit
        const email = paymentEntity.email;
        const notes = paymentEntity.notes || {};
        const name = notes.studentName || notes.name || 'Student';
        const courseId = notes.courseId || notes.courseSlug;
        const planCode = notes.planCode || notes.planId;
        if (!courseId || !planCode) {
            logger_1.default.warn(`Missing metadata in payment notes: Course: ${courseId}, Plan: ${planCode}`);
            // Return 200 to acknowledge webhook receipt but log failure
            res.status(200).json({ success: false, message: 'Missing course/plan metadata in notes' });
            return;
        }
        try {
            await (0, exports.processEnrollment)(email, name, courseId, planCode, {
                paymentId: paymentEntity.id,
                orderId: paymentEntity.order_id,
                amount,
                signature,
            });
            res.status(200).json({ success: true, message: 'Webhook enrollment processed' });
            return;
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
            return;
        }
    }
    res.status(200).json({ success: true, message: 'Event acknowledged' });
};
exports.razorpayWebhook = razorpayWebhook;
// Simulation Route (for development testing)
const simulatePaymentWebhook = async (req, res) => {
    const { email, name, courseIdOrSlug, planCodeOrSlug } = req.body;
    if (!email || !name || !courseIdOrSlug || !planCodeOrSlug) {
        res.status(400).json({ success: false, message: 'Missing details for simulation' });
        return;
    }
    try {
        const paymentId = 'pay_' + crypto_1.default.randomBytes(8).toString('hex');
        const orderId = 'order_' + crypto_1.default.randomBytes(8).toString('hex');
        const result = await (0, exports.processEnrollment)(email, name, courseIdOrSlug, planCodeOrSlug, {
            paymentId,
            orderId,
            amount: 4999,
        });
        res.status(200).json({
            success: true,
            message: 'Simulated payment enrollment successfully processed!',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.simulatePaymentWebhook = simulatePaymentWebhook;
