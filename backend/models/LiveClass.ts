import mongoose, { Schema, Document } from 'mongoose';

export interface ILiveClass extends Document {
  title: string;
  description?: string;
  courseId: mongoose.Types.ObjectId;
  mentorId: mongoose.Types.ObjectId;
  meetingLink: string;
  meetingPlatform: 'zoom' | 'google-meet' | 'other';
  scheduledTime: Date;
  durationMinutes: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  attendance: Array<{
    studentId: mongoose.Types.ObjectId;
    joinedAt: Date;
  }>;
  recordingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LiveClassSchema: Schema<ILiveClass> = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    meetingLink: { type: String, required: true },
    meetingPlatform: {
      type: String,
      enum: ['zoom', 'google-meet', 'other'],
      default: 'google-meet',
    },
    scheduledTime: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, required: true, default: 60 },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    attendance: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    recordingUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ILiveClass>('LiveClass', LiveClassSchema);
