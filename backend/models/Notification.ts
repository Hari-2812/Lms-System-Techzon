import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  title: string;
  message: string;
  type: 'ONBOARDING_CREATED' | 'NEW_ONBOARDING' | 'NEW_STUDENT_ONBOARDING' | 'STUDENT_APPROVED' | 'STUDENT_REJECTED' | 'EMAIL_SENT' | 'EMAIL_FAILED' | 'LIVE_CLASS_CREATED' | 'LIVE_CLASS_UPDATED' | 'LIVE_CLASS_CANCELLED' | 'LIVE_CLASS_REMINDER';
  recipientRole: ('SuperAdmin' | 'Admin' | 'Mentor' | 'Student')[];
  recipientId?: mongoose.Types.ObjectId;
  isRead: boolean;
  metadata?: {
    studentName?: string;
    email?: string;
    course?: string;
    [key: string]: any;
  };
  createdAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['ONBOARDING_CREATED', 'NEW_ONBOARDING', 'NEW_STUDENT_ONBOARDING', 'STUDENT_APPROVED', 'STUDENT_REJECTED', 'EMAIL_SENT', 'EMAIL_FAILED', 'LIVE_CLASS_CREATED', 'LIVE_CLASS_UPDATED', 'LIVE_CLASS_CANCELLED', 'LIVE_CLASS_REMINDER'],
      required: true,
    },
    recipientRole: {
      type: [String],
      enum: ['SuperAdmin', 'Admin', 'Mentor', 'Student'],
      required: true,
      default: ['Admin', 'SuperAdmin'],
    },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User' },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<INotification>('Notification', NotificationSchema);
