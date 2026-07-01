import { Request, Response } from 'express';
import crypto from 'crypto';
import Certificate from '../models/Certificate';
import User from '../models/User';
import Course from '../models/Course';
import logger from '../config/logger';

// Helper function to issue certificate internally
export const generateCertificateOffline = async (
  studentId: any,
  courseId: any,
  enrollmentId: any
): Promise<any> => {
  try {
    const student = await User.findById(studentId);
    const course = await Course.findById(courseId);
    if (!student || !course) {
      throw new Error('Student or Course does not exist.');
    }

    // Check if certificate already issued
    const existing = await Certificate.findOne({ enrollmentId });
    if (existing) return existing;

    const verificationKey = crypto.randomUUID();
    const certificateNumber = 'TZ-' + Date.now().toString().slice(-6) + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();

    // In production we would compile a PDF and upload to Cloudinary, here we simulate a CDN URL
    const pdfUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/certificates/verify/${verificationKey}`;

    const cert = new Certificate({
      certificateNumber,
      studentId,
      courseId,
      enrollmentId,
      issueDate: new Date(),
      verificationKey,
      pdfUrl,
    });
    await cert.save();
    return cert;
  } catch (error) {
    logger.error('Error generating certificate programmatically:', error);
    throw error;
  }
};

export const getStudentCertificates = async (req: any, res: Response): Promise<void> => {
  try {
    const certs = await Certificate.find({ studentId: req.user._id })
      .populate('courseId', 'title category')
      .populate('studentId', 'name email');

    res.status(200).json({ success: true, data: certs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Verification Route (PUBLIC)
export const verifyCertificate = async (req: Request, res: Response): Promise<void> => {
  const { key } = req.params;
  try {
    const cert = await Certificate.findOne({ verificationKey: key })
      .populate('courseId', 'title category description')
      .populate('studentId', 'name email');

    if (!cert) {
      res.status(404).json({ success: false, message: 'Certificate key invalid or expired' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Certificate successfully verified!',
      data: {
        certificateNumber: cert.certificateNumber,
        studentName: (cert.studentId as any)?.name || 'Student',
        courseName: (cert.courseId as any)?.title || 'Course',
        courseCategory: (cert.courseId as any)?.category || '',
        completionDate: cert.issueDate,
        company: 'Techzon Wide',
        qrVerificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/certificates/verify/${key}`,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
