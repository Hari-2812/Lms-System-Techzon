import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

mongoose.connect(process.env.MONGO_URI as string).then(async () => {
  try {
    const courses = await mongoose.connection.db.collection('courses').find().toArray();
    for (const c of courses) {
      const lp = await mongoose.connection.db.collection('learningplans').findOne({ courseId: c._id });
      const defaultLp = await mongoose.connection.db.collection('learningplans').findOne({ courseId: c._id, isDefault: true });
      console.log(`Course: ${c.title} | Has LP: ${!!lp} | Has Default LP: ${!!defaultLp}`);
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
});
