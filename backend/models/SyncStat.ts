import mongoose, { Document, Schema } from 'mongoose';

export interface ISyncStat extends Document {
  lastSync: Date;
  foldersFound: number;
  fetched: number;
  imported: number;
  updated: number;
  skipped: number;
  deleted: number;
  coursesCreated: number;
  modulesCreated: number;
  courseStats: Array<{
    courseName: string;
    count: number;
  }>;
}

const syncStatSchema: Schema = new Schema(
  {
    lastSync: { type: Date, required: true },
    foldersFound: { type: Number, default: 0 },
    fetched: { type: Number, default: 0 },
    imported: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    deleted: { type: Number, default: 0 },
    coursesCreated: { type: Number, default: 0 },
    modulesCreated: { type: Number, default: 0 },
    courseStats: [
      {
        courseName: { type: String },
        count: { type: Number },
      }
    ]
  },
  { timestamps: true }
);

const SyncStat = mongoose.models.SyncStat || mongoose.model<ISyncStat>('SyncStat', syncStatSchema);
export default SyncStat;
