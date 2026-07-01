"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCertificate = exports.getStudentCertificates = exports.generateCertificateOffline = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Certificate_1 = __importDefault(require("../models/Certificate"));
const User_1 = __importDefault(require("../models/User"));
const Course_1 = __importDefault(require("../models/Course"));
const logger_1 = __importDefault(require("../config/logger"));
// Helper function to issue certificate internally
const generateCertificateOffline = async (studentId, courseId, enrollmentId) => {
    try {
        const student = await User_1.default.findById(studentId);
        const course = await Course_1.default.findById(courseId);
        if (!student || !course) {
            throw new Error('Student or Course does not exist.');
        }
        // Check if certificate already issued
        const existing = await Certificate_1.default.findOne({ enrollmentId });
        if (existing)
            return existing;
        const verificationKey = crypto_1.default.randomUUID();
        const certificateNumber = 'TZ-' + Date.now().toString().slice(-6) + '-' + crypto_1.default.randomBytes(2).toString('hex').toUpperCase();
        // In production we would compile a PDF and upload to Cloudinary, here we simulate a CDN URL
        const pdfUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/certificates/verify/${verificationKey}`;
        const cert = new Certificate_1.default({
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
    }
    catch (error) {
        logger_1.default.error('Error generating certificate programmatically:', error);
        throw error;
    }
};
exports.generateCertificateOffline = generateCertificateOffline;
const getStudentCertificates = async (req, res) => {
    try {
        const certs = await Certificate_1.default.find({ studentId: req.user._id })
            .populate('courseId', 'title category')
            .populate('studentId', 'name email');
        res.status(200).json({ success: true, data: certs });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getStudentCertificates = getStudentCertificates;
// Verification Route (PUBLIC)
const verifyCertificate = async (req, res) => {
    const { key } = req.params;
    try {
        const cert = await Certificate_1.default.findOne({ verificationKey: key })
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
                studentName: cert.studentId?.name || 'Student',
                courseName: cert.courseId?.title || 'Course',
                courseCategory: cert.courseId?.category || '',
                completionDate: cert.issueDate,
                company: 'Techzon Wide',
                qrVerificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/certificates/verify/${key}`,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.verifyCertificate = verifyCertificate;
