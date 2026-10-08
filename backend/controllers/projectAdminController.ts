import { Request, Response } from 'express';
import ProjectAssignment from '../models/ProjectAssignment';
import ProjectSubmission from '../models/ProjectSubmission';
import Enrollment from '../models/Enrollment';
import Certificate from '../models/Certificate';
import User from '../models/User';
import Course from '../models/Course';
import { sendProjectAssignedEmail, sendCertificateIssuedEmail } from '../services/email';
import logger from '../config/logger';
import CourseProjectConfig from '../models/CourseProjectConfig';
import Lesson from '../models/Lesson';

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

    if (projectType === 'MAJOR') {
      const minorProject = await ProjectAssignment.findOne({ studentId, courseId, projectType: 'MINOR' });
      if (!minorProject) {
         return res.status(400).json({ success: false, message: 'Student must have a Minor Project assigned first.' });
      }
      const minorSubmission = await ProjectSubmission.findOne({ projectAssignmentId: minorProject._id });
      if (!minorSubmission || !['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(minorSubmission.status)) {
         return res.status(400).json({ success: false, message: 'Student must submit the Minor Project before a Major Project can be assigned.' });
      }
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

export const getCourseProjectConfig = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const config = await CourseProjectConfig.findOne({ courseId });
    if (!config) {
      // Return a default empty structure so the frontend can populate the form
      return res.status(200).json({
        success: true,
        data: {
          minorProject: { title: '', description: '', isActive: true, requirements: [] },
          majorProject: { title: '', description: '', isActive: true, requirements: [] }
        }
      });
    }
    res.status(200).json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllCourseProjectConfigs = async (req: any, res: Response) => {
  try {
    const configs = await CourseProjectConfig.find();
    res.status(200).json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const updateCourseProjectConfig = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const { minorProject, majorProject } = req.body;

    let config = await CourseProjectConfig.findOne({ courseId });
    if (!config) {
      config = new CourseProjectConfig({ courseId, minorProject, majorProject });
    } else {
      config.minorProject = minorProject;
      config.majorProject = majorProject;
    }

    await config.save();
    res.status(200).json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reconcileProjects = async (req: any, res: Response) => {
  try {
    let minorAssignedCount = 0;
    let majorAssignedCount = 0;
    let errors = [];

    const configs = await CourseProjectConfig.find({});
    
    for (const config of configs) {
      const courseId = config.courseId;
      const course = await Course.findById(courseId);
      const courseName = course ? course.title : 'N/A';
      logger.info(`[RECONCILE] Processing config for course: ${courseName} (${courseId})`);

      // Reconcile Minor Projects
      if (config.minorProject && config.minorProject.isActive) {
        logger.info(`[RECONCILE] Minor project active for ${courseName}`);
        const nonLegacyLessonsCount = await Lesson.countDocuments({ courseId, legacy: { $ne: true } });
        logger.info(`[RECONCILE] Non-legacy lessons count: ${nonLegacyLessonsCount}`);
        
        const allEnrollments = await Enrollment.find({ courseId }).populate('studentId', 'name email');
        logger.info(`[RECONCILE] Found ${allEnrollments.length} enrollments for ${courseName}`);
        
        const allLessons = await Lesson.find({ courseId, legacy: { $ne: true } }).lean();
        const validLessonIds = allLessons.map(l => l._id.toString());
        
        const eligibleEnrollments = allEnrollments.filter(enrollment => {
          const validCompleted = enrollment.progress.completedLessons.filter((id: any) => validLessonIds.includes(id.toString()));
          const isEligible = enrollment.progress.percentComplete >= 100 || 
                 (nonLegacyLessonsCount > 0 && validCompleted.length >= nonLegacyLessonsCount);
          if (isEligible) {
             logger.info(`[RECONCILE] Enrollment ${enrollment._id} is eligible. Percent: ${enrollment.progress.percentComplete}, Valid Completed: ${validCompleted.length}/${nonLegacyLessonsCount}`);
          }
          return isEligible;
        });

        for (const enrollment of eligibleEnrollments) {
          const student: any = enrollment.studentId;
          if (!student) continue;

            const existingMinor = await ProjectAssignment.findOne({
              studentId: student._id,
              courseId,
              projectType: 'MINOR'
            });

            if (!existingMinor) {
              logger.info(`[RECONCILE] Creating minor project for student ${student.email}`);
              try {
              let calculatedDueDate = new Date();
              calculatedDueDate.setDate(calculatedDueDate.getDate() + 10);

              const minorProject = new ProjectAssignment({
                studentId: student._id,
                courseId,
                title: config.minorProject.title,
                description: config.minorProject.description,
                instructions: config.minorProject.instructions,
                projectPdf: config.minorProject.projectPdf,
                requirements: config.minorProject.requirements,
                projectType: 'MINOR',
                assignedBy: req.user._id, // Reconciled by Admin
                dueDate: calculatedDueDate,
                status: 'ASSIGNED'
              });
              await minorProject.save();
              minorAssignedCount++;

              await sendProjectAssignedEmail(student.email, student.name, minorProject.title, 'MINOR', courseName, new Date(), calculatedDueDate, 10, minorProject.description, minorProject.projectPdf);
            } catch (err: any) {
              logger.error(`Reconciliation minor project error for student ${student._id}: ${err.message}`);
              errors.push(`Minor project failed for student ${student.email}: ${err.message}`);
            }
          }
        }
      }

      // Reconcile Major Projects
      if (config.majorProject && config.majorProject.isActive) {
        const submittedMinors = await ProjectAssignment.find({
          courseId,
          projectType: 'MINOR',
          status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] }
        }).populate('studentId', 'name email');

        for (const minor of submittedMinors) {
          const student: any = minor.studentId;
          if (!student) continue;

          const existingMajor = await ProjectAssignment.findOne({
            studentId: student._id,
            courseId,
            projectType: 'MAJOR'
          });

          if (!existingMajor) {
            try {
              let calculatedDueDate = new Date();
              calculatedDueDate.setDate(calculatedDueDate.getDate() + 30);

              const majorProject = new ProjectAssignment({
                studentId: student._id,
                courseId,
                title: config.majorProject.title,
                description: config.majorProject.description,
                instructions: config.majorProject.instructions,
                projectPdf: config.majorProject.projectPdf,
                requirements: config.majorProject.requirements,
                projectType: 'MAJOR',
                assignedBy: req.user._id, // Reconciled by Admin
                dueDate: calculatedDueDate,
                status: 'ASSIGNED'
              });
              await majorProject.save();
              majorAssignedCount++;

              await sendProjectAssignedEmail(student.email, student.name, majorProject.title, 'MAJOR', courseName, new Date(), calculatedDueDate, 30, majorProject.description, majorProject.projectPdf);
            } catch (err: any) {
              logger.error(`Reconciliation major project error for student ${student._id}: ${err.message}`);
              errors.push(`Major project failed for student ${student.email}: ${err.message}`);
            }
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Reconciliation complete',
      data: {
        minorAssignedCount,
        majorAssignedCount,
        errors
      }
    });
  } catch (error: any) {
    logger.error(`Reconciliation Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Reconciliation failed', error: error.message });
  }
};

export const getCourseProjectSummary = async (req: any, res: Response) => {
  try {
    // 1. Get all courses with minimal fields to join against
    const courses = await Course.find().select('_id title status');
    
    // 2. Get all project configurations
    const configs = await CourseProjectConfig.find();
    const configMap = new Map();
    configs.forEach(c => {
      configMap.set(c.courseId.toString(), c);
    });

    // 3. Aggregate project assignments (counts by courseId and projectType)
    // We want to count total assignments, pending submissions (SUBMITTED, UNDER_REVIEW, CHANGES_REQUESTED), and fully submitted/completed
    // Actually, "Pending" in the admin view usually means "Student has SUBMITTED, Admin needs to review". 
    // And "Submitted" could mean "Total submitted ever" or "Approved". Let's clarify:
    // Submitted: status === 'SUBMITTED' or 'UNDER_REVIEW' or 'CHANGES_REQUESTED' or 'APPROVED'
    // Pending: status === 'SUBMITTED' or 'UNDER_REVIEW'
    const assignmentStats = await ProjectAssignment.aggregate([
      {
        $group: {
          _id: { courseId: "$courseId", projectType: "$projectType" },
          totalAssigned: { $sum: 1 },
          totalSubmitted: {
            $sum: {
              $cond: [{ $in: ["$status", ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"]] }, 1, 0]
            }
          },
          totalPendingReview: {
            $sum: {
              $cond: [{ $in: ["$status", ["SUBMITTED", "UNDER_REVIEW"]] }, 1, 0]
            }
          }
        }
      }
    ]);

    const statMap = new Map();
    assignmentStats.forEach(stat => {
      const courseIdStr = stat._id.courseId.toString();
      if (!statMap.has(courseIdStr)) {
        statMap.set(courseIdStr, {
          minor: { assigned: 0, submitted: 0, pending: 0 },
          major: { assigned: 0, submitted: 0, pending: 0 }
        });
      }
      const type = stat._id.projectType === 'MINOR' ? 'minor' : 'major';
      statMap.get(courseIdStr)[type] = {
        assigned: stat.totalAssigned,
        submitted: stat.totalSubmitted,
        pending: stat.totalPendingReview
      };
    });

    // 4. Combine data
    const summaries = courses.map(course => {
      const courseId = course._id.toString();
      const config = configMap.get(courseId);
      const stats = statMap.get(courseId) || {
        minor: { assigned: 0, submitted: 0, pending: 0 },
        major: { assigned: 0, submitted: 0, pending: 0 }
      };

      const isMinorConfigured = config ? config.minorProject?.isActive && !!config.minorProject?.title : false;
      const isMajorConfigured = config ? config.majorProject?.isActive && !!config.majorProject?.title : false;

      return {
        courseId: courseId,
        courseName: course.title,
        courseStatus: course.status,
        minorProject: {
          configured: isMinorConfigured,
          title: config?.minorProject?.title || '',
          isActive: config?.minorProject?.isActive || false,
          pdf: config?.minorProject?.projectPdf || null
        },
        majorProject: {
          configured: isMajorConfigured,
          title: config?.majorProject?.title || '',
          isActive: config?.majorProject?.isActive || false,
          pdf: config?.majorProject?.projectPdf || null
        },
        assignments: {
          minor: stats.minor.assigned,
          major: stats.major.assigned
        },
        submissions: {
          minorPending: stats.minor.pending,
          minorSubmitted: stats.minor.submitted,
          majorPending: stats.major.pending,
          majorSubmitted: stats.major.submitted,
          // Aggregate for backwards compatibility or general display
          pending: stats.minor.pending + stats.major.pending,
          submitted: stats.minor.submitted + stats.major.submitted
        }
      };
    });

    res.status(200).json({
      success: true,
      data: summaries
    });
  } catch (error: any) {
    logger.error(`getCourseProjectSummary Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to get course project summary', error: error.message });
  }
};
