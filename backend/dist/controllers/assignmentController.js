"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradeSubmission = exports.getSubmissionsForGrading = exports.submitAssignment = exports.getAssignments = exports.createAssignment = void 0;
const Assignment_1 = __importDefault(require("../models/Assignment"));
const Submission_1 = __importDefault(require("../models/Submission"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const logger_1 = __importDefault(require("../config/logger"));
const createAssignment = async (req, res) => {
    try {
        const assignment = new Assignment_1.default(req.body);
        await assignment.save();
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'CREATE_ASSIGNMENT',
            details: `Created assignment: ${assignment.title} under module ${assignment.moduleId}`,
        });
        res.status(201).json({ success: true, data: assignment });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.createAssignment = createAssignment;
const getAssignments = async (req, res) => {
    const { courseId } = req.query;
    const filter = {};
    if (courseId)
        filter.courseId = courseId;
    try {
        const assignments = await Assignment_1.default.find(filter)
            .populate('courseId', 'title')
            .populate('moduleId', 'title');
        // For students, attach their submission status
        if (req.user.role === 'student') {
            const submissions = await Submission_1.default.find({ studentId: req.user._id });
            const submissionMap = new Map(submissions.map((s) => [s.assignmentId.toString(), s]));
            const data = assignments.map((a) => {
                const sub = submissionMap.get(a._id.toString());
                return {
                    ...a.toObject(),
                    submission: sub
                        ? {
                            status: sub.status,
                            marksObtained: sub.marksObtained,
                            feedback: sub.feedback,
                            submittedAt: sub.submittedAt,
                        }
                        : null,
                };
            });
            res.status(200).json({ success: true, data });
            return;
        }
        res.status(200).json({ success: true, data: assignments });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getAssignments = getAssignments;
const submitAssignment = async (req, res) => {
    const { assignmentId, submissionType, fileUrl, repoUrl, gdriveUrl, notes } = req.body;
    if (!assignmentId || !submissionType) {
        res.status(400).json({ success: false, message: 'Assignment ID and submission type are required' });
        return;
    }
    try {
        const assignment = await Assignment_1.default.findById(assignmentId);
        if (!assignment) {
            res.status(404).json({ success: false, message: 'Assignment not found' });
            return;
        }
        // Check submission deadline
        const status = new Date() > new Date(assignment.deadline) ? 'late' : 'submitted';
        const submission = await Submission_1.default.findOneAndUpdate({ studentId: req.user._id, assignmentId }, {
            submissionType,
            fileUrl,
            repoUrl,
            gdriveUrl,
            notes,
            status,
            submittedAt: new Date(),
        }, { upsert: true, new: true });
        res.status(200).json({ success: true, data: submission });
    }
    catch (error) {
        logger_1.default.error('Assignment submission error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.submitAssignment = submitAssignment;
const getSubmissionsForGrading = async (req, res) => {
    const { assignmentId } = req.query;
    const filter = {};
    if (assignmentId)
        filter.assignmentId = assignmentId;
    try {
        const submissions = await Submission_1.default.find(filter)
            .populate('studentId', 'name email')
            .populate('assignmentId', 'title maxMarks');
        res.status(200).json({ success: true, data: submissions });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getSubmissionsForGrading = getSubmissionsForGrading;
const gradeSubmission = async (req, res) => {
    const { id } = req.params; // submission id
    const { marksObtained, feedback } = req.body;
    if (marksObtained === undefined) {
        res.status(400).json({ success: false, message: 'Marks obtained is required' });
        return;
    }
    try {
        const submission = await Submission_1.default.findById(id).populate('assignmentId');
        if (!submission) {
            res.status(404).json({ success: false, message: 'Submission record not found' });
            return;
        }
        const assignment = submission.assignmentId;
        if (marksObtained > assignment.maxMarks) {
            res.status(400).json({
                success: false,
                message: `Marks obtained cannot exceed maximum marks (${assignment.maxMarks})`,
            });
            return;
        }
        submission.marksObtained = marksObtained;
        submission.feedback = feedback;
        submission.status = 'graded';
        submission.gradedBy = req.user._id;
        submission.gradedAt = new Date();
        await submission.save();
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'GRADE_ASSIGNMENT',
            details: `Graded submission ID: ${submission._id}. Marks: ${marksObtained}/${assignment.maxMarks}`,
        });
        res.status(200).json({ success: true, data: submission });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.gradeSubmission = gradeSubmission;
