import mongoose, { Schema, Document } from 'mongoose';

export interface ISubmission extends Document {
  assignmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  submissionType: 'pdf' | 'zip' | 'github' | 'gdrive';
  fileUrl?: string;
  repoUrl?: string;
  gdriveUrl?: string;
  notes?: string;
  status: 'submitted' | 'graded' | 'late' | 'returned';
  marksObtained?: number;
  feedback?: string;
  gradedBy?: mongoose.Types.ObjectId;
  gradedAt?: Date;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema: Schema<ISubmission> = new Schema(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submissionType: {
      type: String,
      enum: ['pdf', 'zip', 'github', 'gdrive'],
      required: true,
    },
    fileUrl: { type: String },
    repoUrl: { type: String },
    gdriveUrl: { type: String },
    notes: { type: String },
    status: {
      type: String,
      enum: ['submitted', 'graded', 'late', 'returned'],
      default: 'submitted',
    },
    marksObtained: { type: Number },
    feedback: { type: String },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Allow one submission per student per assignment
SubmissionSchema.index({ studentId: 1, assignmentId: 1 }, { unique: true });

export default mongoose.model<ISubmission>('Submission', SubmissionSchema);
