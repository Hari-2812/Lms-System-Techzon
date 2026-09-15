import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectSubmission extends Document {
  projectAssignmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  version: number;
  submittedAt: Date;
  links: {
    githubUrl?: string;
    liveUrl?: string;
    figmaUrl?: string;
    demoVideoUrl?: string;
    datasetUrl?: string;
    dashboardUrl?: string;
    otherUrl?: string;
  };
  files: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string; // e.g. 'screenshot', 'documentation', 'output'
  }>;
  notes?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';
  adminFeedback?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSubmissionSchema: Schema<IProjectSubmission> = new Schema(
  {
    projectAssignmentId: { type: Schema.Types.ObjectId, ref: 'ProjectAssignment', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    version: { type: Number, default: 1 },
    submittedAt: { type: Date, default: Date.now },
    links: {
      githubUrl: { type: String },
      liveUrl: { type: String },
      figmaUrl: { type: String },
      demoVideoUrl: { type: String },
      datasetUrl: { type: String },
      dashboardUrl: { type: String },
      otherUrl: { type: String },
    },
    files: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
        fileType: { type: String },
      },
    ],
    notes: { type: String },
    status: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'],
      default: 'SUBMITTED',
    },
    adminFeedback: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IProjectSubmission>('ProjectSubmission', ProjectSubmissionSchema);
