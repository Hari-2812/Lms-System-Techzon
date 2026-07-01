"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLiveClass = exports.joinLiveClass = exports.createLiveClass = exports.getLiveClasses = void 0;
const LiveClass_1 = __importDefault(require("../models/LiveClass"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const getLiveClasses = async (req, res) => {
    try {
        let classes;
        if (['super-admin', 'admin', 'mentor', 'support'].includes(req.user.role)) {
            classes = await LiveClass_1.default.find().populate('courseId', 'title').populate('mentorId', 'name email');
        }
        else {
            // Students only see live classes scheduled for their enrolled courses
            classes = await LiveClass_1.default.find({ status: 'scheduled' })
                .populate('courseId', 'title')
                .populate('mentorId', 'name email');
        }
        res.status(200).json({ success: true, data: classes });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getLiveClasses = getLiveClasses;
const createLiveClass = async (req, res) => {
    try {
        const liveClass = new LiveClass_1.default({
            ...req.body,
            mentorId: req.user._id,
        });
        await liveClass.save();
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'CREATE_LIVE_CLASS',
            details: `Scheduled live class: ${liveClass.title} under course ${liveClass.courseId}`,
        });
        res.status(201).json({ success: true, data: liveClass });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.createLiveClass = createLiveClass;
const joinLiveClass = async (req, res) => {
    const { id } = req.params;
    try {
        const liveClass = await LiveClass_1.default.findById(id);
        if (!liveClass) {
            res.status(404).json({ success: false, message: 'Live class not found' });
            return;
        }
        if (req.user.role === 'student') {
            const alreadyAttended = liveClass.attendance.some((a) => a.studentId.toString() === req.user._id.toString());
            if (!alreadyAttended) {
                liveClass.attendance.push({
                    studentId: req.user._id,
                    joinedAt: new Date(),
                });
                await liveClass.save();
            }
        }
        res.status(200).json({
            success: true,
            message: 'Joined live class successfully',
            meetingLink: liveClass.meetingLink,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.joinLiveClass = joinLiveClass;
const updateLiveClass = async (req, res) => {
    const { id } = req.params;
    try {
        const liveClass = await LiveClass_1.default.findByIdAndUpdate(id, req.body, { new: true });
        if (!liveClass) {
            res.status(404).json({ success: false, message: 'Class not found' });
            return;
        }
        res.status(200).json({ success: true, data: liveClass });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.updateLiveClass = updateLiveClass;
