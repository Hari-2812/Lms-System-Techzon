import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOnboardingRequest extends Document {
  source: string;
  sourceResponseId?: string;
  sourceRowId: string;
  
  submittedAt: Date;
  syncedAt: Date;
  
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED';
  
  student?: {
    userId: Types.ObjectId;
  };
  
  personalDetails: {
    fullName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  
  addressDetails?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  
  educationDetails?: {
    qualification?: string;
    college?: string;
    experience?: string;
  };
  
  courseDetails: {
    course: string;
    courseType?: string;
    batch?: string;
    preferredMode?: string;
  };
  
  paymentDetails?: {
    paymentStatus?: string;
    transactionId?: string;
  };
  
  rawFormData: Record<string, any>;
  
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;
  
  rejectedAt?: Date;
  rejectedBy?: Types.ObjectId;
  
  rejectionReason?: string;
}

const OnboardingRequestSchema: Schema<IOnboardingRequest> = new Schema({
  source: { type: String, default: 'google_form', required: true },
  sourceResponseId: { type: String },
  sourceRowId: { type: String, required: true },
  
  submittedAt: { type: Date, required: true, default: Date.now },
  syncedAt: { type: Date, required: true, default: Date.now },
  
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'FAILED'],
    default: 'PENDING',
    required: true
  },
  
  student: {
    userId: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  
  personalDetails: {
    fullName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    dateOfBirth: String,
    gender: String,
  },
  
  addressDetails: {
    address: String,
    city: String,
    state: String,
    pincode: String,
  },
  
  educationDetails: {
    qualification: String,
    college: String,
    experience: String,
  },
  
  courseDetails: {
    course: { type: String, required: true },
    courseType: String,
    batch: String,
    preferredMode: String,
  },
  
  paymentDetails: {
    paymentStatus: String,
    transactionId: String,
  },
  
  rawFormData: { type: Schema.Types.Mixed, default: {} },
  
  approvedAt: Date,
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
  rejectedAt: Date,
  rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
  rejectionReason: String,
}, {
  timestamps: true
});

// Index to prevent duplicate entries from the same form submission
OnboardingRequestSchema.index({ source: 1, sourceRowId: 1 }, { unique: true });
OnboardingRequestSchema.index({ 'personalDetails.email': 1 });
OnboardingRequestSchema.index({ status: 1 });

export default mongoose.model<IOnboardingRequest>('OnboardingRequest', OnboardingRequestSchema);
