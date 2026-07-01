import { Request, Response } from 'express';
import Assignment from '../models/Assignment';
import Submission from '../models/Submission';
import AuditLog from '../models/AuditLog';
import logger from '../config/logger';

export const createAssignment = async (req: any, res: Response): Promise<void> => {
  try {
    const assignment = new Assignment(req.body);
    await assignment.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'CREATE_ASSIGNMENT',
      details: `Created assignment: ${assignment.title} under module ${assignment.moduleId}`,
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getAssignments = async (req: any, res: Response): Promise<void> => {
  const { courseId } = req.query;
  const filter: any = {};
  if (courseId) filter.courseId = courseId;

  try {
    const assignments = await Assignment.find(filter)
      .populate('courseId', 'title')
      .populate('moduleId', 'title');

    // For students, attach their submission status
    if (req.user.role === 'student') {
      const submissions = await Submission.find({ studentId: req.user._id });
      const submissionMap = new Map(
        submissions.map((s) => [s.assignmentId.toString(), s])
      );

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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const submitAssignment = async (req: any, res: Response): Promise<void> => {
  const { assignmentId, submissionType, fileUrl, repoUrl, gdriveUrl, notes } = req.body;

  if (!assignmentId || !submissionType) {
    res.status(400).json({ success: false, message: 'Assignment ID and submission type are required' });
    return;
  }

  try {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      res.status(404).json({ success: false, message: 'Assignment not found' });
      return;
    }

    // Check submission deadline
    const status = new Date() > new Date(assignment.deadline) ? 'late' : 'submitted';

    const submission = await Submission.findOneAndUpdate(
      { studentId: req.user._id, assignmentId },
      {
        submissionType,
        fileUrl,
        repoUrl,
        gdriveUrl,
        notes,
        status,
        submittedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, data: submission });
  } catch (error: any) {
    logger.error('Assignment submission error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSubmissionsForGrading = async (req: any, res: Response): Promise<void> => {
  const { assignmentId } = req.query;
  const filter: any = {};
  if (assignmentId) filter.assignmentId = assignmentId;

  try {
    const submissions = await Submission.find(filter)
      .populate('studentId', 'name email')
      .populate('assignmentId', 'title maxMarks');

    res.status(200).json({ success: true, data: submissions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const gradeSubmission = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params; // submission id
  const { marksObtained, feedback } = req.body;

  if (marksObtained === undefined) {
    res.status(400).json({ success: false, message: 'Marks obtained is required' });
    return;
  }

  try {
    const submission = await Submission.findById(id).populate('assignmentId');
    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission record not found' });
      return;
    }

    const assignment = submission.assignmentId as any;
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

    await AuditLog.create({
      userId: req.user._id,
      action: 'GRADE_ASSIGNMENT',
      details: `Graded submission ID: ${submission._id}. Marks: ${marksObtained}/${assignment.maxMarks}`,
    });

    res.status(200).json({ success: true, data: submission });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
