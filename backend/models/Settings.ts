import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  appName: string;
  companyName: string;
  logoUrl?: string;
  supportEmail: string;
  supportNumber: string;
  maintenanceMode: boolean;
  termsAndConditions?: string;
  privacyPolicy?: string;
  refundPolicy?: string;
  zoomSettings?: {
    apiKey?: string;
    apiSecret?: string;
  };
  googleMeetSettings?: {
    clientId?: string;
    clientSecret?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema: Schema<ISettings> = new Schema(
  {
    appName: { type: String, required: true, default: 'Techzon LMS System' },
    companyName: { type: String, required: true, default: 'Techzon Wide' },
    logoUrl: { type: String },
    supportEmail: { type: String, required: true, default: 'support@techzonwide.com' },
    supportNumber: { type: String, required: true, default: '+91 6374191654' },
    maintenanceMode: { type: Boolean, default: false },
    termsAndConditions: { type: String },
    privacyPolicy: { type: String },
    refundPolicy: { type: String },
    zoomSettings: {
      apiKey: { type: String },
      apiSecret: { type: String },
    },
    googleMeetSettings: {
      clientId: { type: String },
      clientSecret: { type: String },
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISettings>('Settings', SettingsSchema);
