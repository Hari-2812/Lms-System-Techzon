import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailCampaign extends Document {
  subject: string;
  templateType: string;
  htmlContent: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  status: 'draft' | 'sending' | 'completed' | 'failed';
  courseId?: mongoose.Types.ObjectId;
  liveClassId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmailCampaignSchema: Schema = new Schema({
  subject: { type: String, required: true },
  templateType: { type: String, required: true },
  htmlContent: { type: String, required: true },
  recipientCount: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  pendingCount: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'sending', 'completed', 'failed'], default: 'draft' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  liveClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveClass' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model<IEmailCampaign>('EmailCampaign', EmailCampaignSchema);
