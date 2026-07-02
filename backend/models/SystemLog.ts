import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemLog extends Document {
  message: string;
  stack?: string;
  url?: string;
  userId?: string;
  browser?: string;
  timestamp: Date;
}

const SystemLogSchema: Schema<ISystemLog> = new Schema(
  {
    message: { type: String, required: true },
    stack: { type: String },
    url: { type: String },
    userId: { type: String },
    browser: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<ISystemLog>('SystemLog', SystemLogSchema);
