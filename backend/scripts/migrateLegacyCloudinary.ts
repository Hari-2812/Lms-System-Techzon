import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lesson from '../models/Lesson';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const migrate = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/techzone';
    console.log('Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find lessons that either do not have provider='bunny', or have a videoId reference (which means old Cloudinary video)
    const result = await Lesson.updateMany(
      { provider: { $ne: 'bunny' } },
      { $set: { provider: 'cloudinary', legacy: true } }
    );
    console.log(`Migrated legacy lessons. Modified count: ${result.modifiedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
