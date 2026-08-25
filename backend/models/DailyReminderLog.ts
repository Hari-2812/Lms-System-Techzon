import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyReminderLog extends Document {
  studentId: mongoose.Types.ObjectId;
  date: string; // Format: YYYY-MM-DD
  type: string; // e.g., 'EMAIL_REMINDER'
  sentAt: Date;
}

const DailyReminderLogSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    type: { type: String, required: true },
    sentAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Enforce deduplication at the database level
DailyReminderLogSchema.index({ studentId: 1, date: 1, type: 1 }, { unique: true });

export default mongoose.models.DailyReminderLog || mongoose.model<IDailyReminderLog>('DailyReminderLog', DailyReminderLogSchema);
