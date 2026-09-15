import { Request, Response } from 'express';
import ProjectAssignment from '../models/ProjectAssignment';
import ProjectSubmission from '../models/ProjectSubmission';

export const getMyProject = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const project = await ProjectAssignment.findOne({ studentId: req.user._id, courseId })
      .populate('submissionId');
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'No project assigned' });
    }

    const submission = await ProjectSubmission.findOne({ projectAssignmentId: project._id }).sort('-version');

    res.status(200).json({ success: true, data: { project, submission } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitProject = async (req: any, res: Response) => {
  try {
    const { id } = req.params; // projectAssignmentId
    const { links, files, notes } = req.body;

    const project = await ProjectAssignment.findById(id);
    if (!project || project.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized or not found' });
    }

    let submission = await ProjectSubmission.findOne({ projectAssignmentId: id }).sort('-version');
    let version = 1;

    if (submission) {
      if (['UNDER_REVIEW', 'APPROVED'].includes(submission.status)) {
        return res.status(400).json({ success: false, message: 'Cannot edit submission at this stage' });
      }
      if (submission.status === 'CHANGES_REQUESTED') {
        version = submission.version + 1;
      }
    }

    const newSubmission = new ProjectSubmission({
      projectAssignmentId: id,
      studentId: req.user._id,
      courseId: project.courseId,
      version,
      links,
      files,
      notes,
      status: 'SUBMITTED'
    });
    await newSubmission.save();

    project.status = 'SUBMITTED';
    project.submissionId = newSubmission._id as any;
    await project.save();

    res.status(200).json({ success: true, data: newSubmission });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
