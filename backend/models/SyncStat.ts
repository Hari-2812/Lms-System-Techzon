import mongoose, { Schema, Document } from 'mongoose';

export interface ISyncStat extends Document {
  timestamp: Date;
  totalRows: number;
  processed: number;
  created: number;
  updated: number;
  alreadySynced: number;
  failed: number;
  skipped: number;
  syncErrors: Array<{
    row: number;
    email: string;
    reason: string;
    message: string;
  }>;
}

const SyncStatSchema: Schema<ISyncStat> = new Schema(
  {
    timestamp: { type: Date, default: Date.now },
    totalRows: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    created: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    alreadySynced: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    syncErrors: [
      {
        row: Number,
        email: String,
        reason: String,
        message: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<ISyncStat>('SyncStat', SyncStatSchema);
