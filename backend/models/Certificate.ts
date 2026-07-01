import mongoose, { Schema, Document } from 'mongoose';

export interface ICertificate extends Document {
  certificateNumber: string;
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  enrollmentId: mongoose.Types.ObjectId;
  issueDate: Date;
  pdfUrl?: string;
  verificationKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateSchema: Schema<ICertificate> = new Schema(
  {
    certificateNumber: { type: String, required: true, unique: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true, unique: true },
    issueDate: { type: Date, required: true, default: Date.now },
    pdfUrl: { type: String },
    verificationKey: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICertificate>('Certificate', CertificateSchema);
