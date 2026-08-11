import mongoose, { Schema, Document } from 'mongoose';

export interface IGoogleSyncRecord extends Document {
  source: string;
  sourceRowId: string;
  syncedAt: Date;
}

const GoogleSyncRecordSchema: Schema<IGoogleSyncRecord> = new Schema({
  source: { type: String, required: true },
  sourceRowId: { type: String, required: true },
  syncedAt: { type: Date, required: true, default: Date.now }
});

// Index to prevent duplicate entries from the same form submission row
GoogleSyncRecordSchema.index({ source: 1, sourceRowId: 1 }, { unique: true });

export default mongoose.model<IGoogleSyncRecord>('GoogleSyncRecord', GoogleSyncRecordSchema);
