import { Request, Response } from 'express';
import ProjectAssignment from '../models/ProjectAssignment';
import ProjectSubmission from '../models/ProjectSubmission';
import Enrollment from '../models/Enrollment';
import Certificate from '../models/Certificate';
import User from '../models/User';
import Course from '../models/Course';
import { sendProjectAssignedEmail, sendCertificateIssuedEmail } from '../services/email';
import logger from '../config/logger';


export const assignProject = async (req: any, res: Response) => {
  try {
    const { studentId } = req.params;
    const { courseId, title, description, instructions, projectPdf, requirements, domain, batch, projectType } = req.body;

    const enrollment = await Enrollment.findOne({ studentId, courseId });
    if (!enrollment || enrollment.progress.percentComplete < 100) {
      return res.status(400).json({ success: false, message: 'Student must complete 100% of the course first' });
    }

    if (!projectType || !['MINOR', 'MAJOR'].includes(projectType)) {
      return res.status(400).json({ success: false, message: 'Valid projectType (MINOR or MAJOR) is required' });
    }

    const existing = await ProjectAssignment.findOne({ studentId, courseId, projectType });
    if (existing) {
      return res.status(400).json({ success: false, message: `${projectType} Project already assigned for this course` });
    }

    let calculatedDueDate = new Date();
    if (projectType === 'MINOR') {
      calculatedDueDate.setDate(calculatedDueDate.getDate() + 10);
    } else {
      calculatedDueDate.setDate(calculatedDueDate.getDate() + 30);
    }

    const project = new ProjectAssignment({
      studentId,
      courseId,
      title,
      description,
      instructions,
      projectPdf,
      dueDate: calculatedDueDate,
      requirements,
      domain,
      batch,
      projectType,
      assignedBy: req.user._id,
      status: 'ASSIGNED'
    });
    await project.save();

    const student = await User.findById(studentId);
    let emailSent = false;
    
    if (student && student.email) {
      const course = await Course.findById(courseId);
      const courseName = course ? course.title : 'N/A';
      
      try {
        await sendProjectAssignedEmail(
          student.email,
          student.name,
          title,
          projectType,
          courseName,
          project.assignedAt || new Date(),
          calculatedDueDate,
          projectType === 'MINOR' ? 10 : 30,
          description,
          projectPdf
        );
        emailSent = true;
      } catch (emailError: any) {
        logger.error(`Failed to send project assignment email to ${student.email}:`, emailError);
        // Do not roll back or throw; email failure is gracefully handled
      }
    }

    res.status(201).json({ success: true, data: project, emailSent });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjects = async (req: any, res: Response) => {
  try {
    const projects = await ProjectAssignment.find()
      .populate('studentId', 'name email')
      .populate('courseId', 'title')
      .populate('submissionId');
    res.status(200).json({ success: true, data: projects });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveProject = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const project = await ProjectAssignment.findById(id).populate('studentId courseId');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    
    if (project.status === 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Project already approved' });
    }

    const submission = await ProjectSubmission.findOne({ projectAssignmentId: id }).sort('-version');
    if (!submission) {
      return res.status(400).json({ success: false, message: 'No submission found' });
    }

    project.status = 'APPROVED';
    await project.save();

    submission.status = 'APPROVED';
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    await submission.save();

    const enrollment = await Enrollment.findOne({ studentId: project.studentId, courseId: project.courseId });
    if (enrollment) {
      enrollment.status = 'completed';
      await enrollment.save();
    }

    // Generate Certificate Idempotently
    let certificate = await Certificate.findOne({ studentId: project.studentId, courseId: project.courseId });
    if (!certificate) {
      const certNumber = 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      certificate = new Certificate({
        certificateNumber: certNumber,
        studentId: project.studentId,
        courseId: project.courseId,
        enrollmentId: enrollment?._id,
        verificationKey: certNumber
      });
      await certificate.save();
      
      if (enrollment) {
        enrollment.certificateIssued = true;
        enrollment.certificateId = certificate._id as any;
        await enrollment.save();
      }

      const student: any = project.studentId;
      const course: any = project.courseId;
      await sendCertificateIssuedEmail(student.email, student.name, course.title, certNumber, `https://lms-system-techzon.vercel.app/verify/${certNumber}`);
    }

    res.status(200).json({ success: true, message: 'Project approved and certificate generated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const requestChanges = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    
    const project = await ProjectAssignment.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    
    const submission = await ProjectSubmission.findOne({ projectAssignmentId: id }).sort('-version');
    if (!submission) return res.status(400).json({ success: false, message: 'No submission found' });

    project.status = 'CHANGES_REQUESTED';
    await project.save();

    submission.status = 'CHANGES_REQUESTED';
    submission.adminFeedback = feedback;
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    await submission.save();

    res.status(200).json({ success: true, message: 'Changes requested successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
