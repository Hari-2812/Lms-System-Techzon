import { Request, Response } from 'express';
import ProjectAssignment from '../models/ProjectAssignment';
import ProjectSubmission from '../models/ProjectSubmission';
import Enrollment from '../models/Enrollment';
import CourseProjectConfig from '../models/CourseProjectConfig';
import Course from '../models/Course';
import { sendProjectAssignedEmail } from '../services/email';
import logger from '../config/logger';

export const getMyProject = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user._id;

    const enrollment = await Enrollment.findOne({ studentId, courseId });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Enrollment not found' });
    }

    const config = await CourseProjectConfig.findOne({ courseId });
    
    // Check current assigned projects
    let projects = await ProjectAssignment.find({ studentId, courseId }).populate('submissionId');
    
    // Auto-assignment logic is now handled authoritatively by course progression (Minor)
    // and project submission (Major).
    // The lazy assignment logic has been removed.

    // Prepare response data with dummy locked projects if applicable
    const responseData = [];
    let minorProject = projects.find(p => p.projectType === 'MINOR');
    let majorProject = projects.find(p => p.projectType === 'MAJOR');

    if (minorProject) {
      const submission = await ProjectSubmission.findOne({ projectAssignmentId: minorProject._id }).sort('-version');
      responseData.push({ project: minorProject, submission });
    } else if (config && config.minorProject.isActive) {
      responseData.push({
        project: {
          _id: 'locked_minor',
          projectType: 'MINOR',
          title: config.minorProject.title,
          description: 'Complete 100% of your course videos to unlock the Minor Project.',
          status: 'LOCKED',
          courseProgress: enrollment.progress.percentComplete
        },
        submission: null
      });
    }

    if (majorProject) {
      const submission = await ProjectSubmission.findOne({ projectAssignmentId: majorProject._id }).sort('-version');
      responseData.push({ project: majorProject, submission });
    } else if (config && config.majorProject.isActive) {
      responseData.push({
        project: {
          _id: 'locked_major',
          projectType: 'MAJOR',
          title: config.majorProject.title,
          description: 'Submit your Minor Project successfully to unlock the Major Project.',
          status: 'LOCKED'
        },
        submission: null
      });
    }

    res.status(200).json({ success: true, data: responseData });
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

    // Only minor project requires course completion for submission
    if (project.projectType === 'MINOR') {
      const enrollment = await Enrollment.findOne({ studentId: req.user._id, courseId: project.courseId });
      if (!enrollment || enrollment.progress.percentComplete < 100) {
        return res.status(403).json({ success: false, message: 'Course must be 100% completed before submitting the Minor Project' });
      }
    } else if (project.projectType === 'MAJOR') {
      // Major project requires minor project submission
      const minorProject = await ProjectAssignment.findOne({ studentId: req.user._id, courseId: project.courseId, projectType: 'MINOR' });
      if (!minorProject || !['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(minorProject.status)) {
        return res.status(403).json({ success: false, message: 'Minor Project must be submitted before submitting the Major Project' });
      }
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

    // Auto-assign Major Project if this is a Minor Project submission
    if (project.projectType === 'MINOR') {
      try {
        const config = await CourseProjectConfig.findOne({ courseId: project.courseId });
        if (config && config.majorProject && config.majorProject.isActive) {
          const existingMajorProject = await ProjectAssignment.findOne({
            studentId: req.user._id,
            courseId: project.courseId,
            projectType: 'MAJOR'
          });

          if (!existingMajorProject) {
            let calculatedDueDate = new Date();
            calculatedDueDate.setDate(calculatedDueDate.getDate() + 30);

            const course = await Course.findById(project.courseId);
            const courseName = course ? course.title : 'N/A';

            const majorProject = new ProjectAssignment({
              studentId: req.user._id,
              courseId: project.courseId,
              title: config.majorProject.title,
              description: config.majorProject.description,
              instructions: config.majorProject.instructions,
              projectPdf: config.majorProject.projectPdf,
              requirements: config.majorProject.requirements,
              projectType: 'MAJOR',
              assignedBy: req.user._id, // System assigned
              dueDate: calculatedDueDate,
              status: 'ASSIGNED'
            });
            await majorProject.save();

            try {
              await sendProjectAssignedEmail(req.user.email, req.user.name, majorProject.title, 'MAJOR', courseName, new Date(), calculatedDueDate, 30, majorProject.description, majorProject.projectPdf);
            } catch (e) {
              logger.error('Failed to send auto-assigned major project email', e);
            }
          }
        }
      } catch (err) {
        logger.error('Failed to auto-assign major project:', err);
      }
    }

    res.status(200).json({ success: true, data: newSubmission });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
