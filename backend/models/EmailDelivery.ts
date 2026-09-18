import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailDelivery extends Document {
  campaignId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  email: string;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
}

const EmailDeliverySchema: Schema = new Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailCampaign', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  errorMessage: { type: String },
  sentAt: { type: Date }
}, { timestamps: true });

export default mongoose.model<IEmailDelivery>('EmailDelivery', EmailDeliverySchema);
