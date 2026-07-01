import mongoose, { Schema, Document } from 'mongoose';

export interface ILearningPlan extends Document {
  name: string; // e.g. "Self-Paced", "Mentor-Led", "Advanced Mentor"
  code: string; // e.g. "self-paced", "mentor-led", "advanced-mentor"
  price: number;
  durationMonths: number;
  features: {
    recordedClasses: boolean;
    pdfsAndNotes: boolean;
    quizzes: boolean;
    assignments: boolean;
    communitySupport: boolean;
    certificates: boolean;
    liveClasses: boolean;
    mentorSessions: boolean;
    doubtClearing: boolean;
    careerGuidance: boolean;
    mockInterviews: boolean;
    resumeReview: boolean;
    placementSupport: boolean;
    projectsCount: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LearningPlanSchema: Schema<ILearningPlan> = new Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    price: { type: Number, required: true },
    durationMonths: { type: Number, required: true, default: 6 },
    features: {
      recordedClasses: { type: Boolean, default: true },
      pdfsAndNotes: { type: Boolean, default: true },
      quizzes: { type: Boolean, default: true },
      assignments: { type: Boolean, default: true },
      communitySupport: { type: Boolean, default: true },
      certificates: { type: Boolean, default: true },
      liveClasses: { type: Boolean, default: false },
      mentorSessions: { type: Boolean, default: false },
      doubtClearing: { type: Boolean, default: false },
      careerGuidance: { type: Boolean, default: false },
      mockInterviews: { type: Boolean, default: false },
      resumeReview: { type: Boolean, default: false },
      placementSupport: { type: Boolean, default: false },
      projectsCount: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ILearningPlan>('LearningPlan', LearningPlanSchema);
