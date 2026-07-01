import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  paymentId?: string;
  orderId: string;
  signature?: string;
  studentEmail: string;
  studentName: string;
  courseId: mongoose.Types.ObjectId;
  learningPlanId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: 'created' | 'captured' | 'failed' | 'refunded';
  invoiceUrl?: string;
  transactionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema<IPayment> = new Schema(
  {
    paymentId: { type: String, index: true },
    orderId: { type: String, required: true, unique: true, index: true },
    signature: { type: String },
    studentEmail: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    learningPlanId: { type: Schema.Types.ObjectId, ref: 'LearningPlan', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['created', 'captured', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    invoiceUrl: { type: String },
    transactionDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>('Payment', PaymentSchema);
