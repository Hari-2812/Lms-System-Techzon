"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePlan = exports.updatePlan = exports.createPlan = exports.getAllPlansAdmin = exports.getPlans = exports.seedDefaultPlans = void 0;
const LearningPlan_1 = __importDefault(require("../models/LearningPlan"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
// Seed default plans if they don't exist
const seedDefaultPlans = async () => {
    const count = await LearningPlan_1.default.countDocuments();
    if (count > 0)
        return;
    const defaultPlans = [
        {
            name: 'Self-Paced Learning',
            code: 'self-paced',
            price: 2499,
            durationMonths: 6,
            features: {
                recordedClasses: true,
                pdfsAndNotes: true,
                quizzes: true,
                assignments: true,
                communitySupport: true,
                certificates: true,
                liveClasses: false,
                mentorSessions: false,
                doubtClearing: false,
                careerGuidance: false,
                mockInterviews: false,
                resumeReview: false,
                placementSupport: false,
                projectsCount: 2,
            },
        },
        {
            name: 'Mentor-Led Learning',
            code: 'mentor-led',
            price: 5499,
            durationMonths: 6,
            features: {
                recordedClasses: true,
                pdfsAndNotes: true,
                quizzes: true,
                assignments: true,
                communitySupport: true,
                certificates: true,
                liveClasses: true,
                mentorSessions: true,
                doubtClearing: true,
                careerGuidance: true,
                mockInterviews: false,
                resumeReview: false,
                placementSupport: false,
                projectsCount: 4, // 2 extra projects
            },
        },
        {
            name: 'Advanced Mentor Plan',
            code: 'advanced-mentor',
            price: 14999,
            durationMonths: 12,
            features: {
                recordedClasses: true,
                pdfsAndNotes: true,
                quizzes: true,
                assignments: true,
                communitySupport: true,
                certificates: true,
                liveClasses: true,
                mentorSessions: true,
                doubtClearing: true,
                careerGuidance: true,
                mockInterviews: true,
                resumeReview: true,
                placementSupport: true,
                projectsCount: 6,
            },
        },
    ];
    await LearningPlan_1.default.insertMany(defaultPlans);
    console.log('Default Learning Plans seeded successfully.');
};
exports.seedDefaultPlans = seedDefaultPlans;
const getPlans = async (req, res) => {
    try {
        const plans = await LearningPlan_1.default.find({ isActive: true });
        res.status(200).json({ success: true, data: plans });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getPlans = getPlans;
const getAllPlansAdmin = async (req, res) => {
    try {
        const plans = await LearningPlan_1.default.find();
        res.status(200).json({ success: true, data: plans });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getAllPlansAdmin = getAllPlansAdmin;
const createPlan = async (req, res) => {
    try {
        const plan = new LearningPlan_1.default(req.body);
        await plan.save();
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'CREATE_PLAN',
            details: `Created new learning plan: ${plan.name}`,
        });
        res.status(201).json({ success: true, data: plan });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.createPlan = createPlan;
const updatePlan = async (req, res) => {
    const { id } = req.params;
    try {
        const plan = await LearningPlan_1.default.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!plan) {
            res.status(404).json({ success: false, message: 'Plan not found' });
            return;
        }
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'UPDATE_PLAN',
            details: `Updated learning plan: ${plan.name}`,
        });
        res.status(200).json({ success: true, data: plan });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.updatePlan = updatePlan;
const deletePlan = async (req, res) => {
    const { id } = req.params;
    try {
        const plan = await LearningPlan_1.default.findByIdAndUpdate(id, { isActive: false }, { new: true });
        if (!plan) {
            res.status(404).json({ success: false, message: 'Plan not found' });
            return;
        }
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'DELETE_PLAN',
            details: `Deactivated learning plan: ${plan.name}`,
        });
        res.status(200).json({ success: true, message: 'Plan deactivated successfully' });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.deletePlan = deletePlan;
