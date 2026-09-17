import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const UserSchema = new mongoose.Schema({ name: String, email: String }, { strict: false });
const EnrollmentSchema = new mongoose.Schema({ studentId: mongoose.Schema.Types.ObjectId, courseId: mongoose.Schema.Types.ObjectId, status: String, progress: Object }, { strict: false });
const CourseSchema = new mongoose.Schema({ title: String }, { strict: false });
const LessonSchema = new mongoose.Schema({ courseId: mongoose.Schema.Types.ObjectId, title: String }, { strict: false });

const User = mongoose.model('User', UserSchema);
const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);
const Course = mongoose.model('Course', CourseSchema);
const Lesson = mongoose.model('Lesson', LessonSchema);

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/techzon-lms');
  console.log('Connected to DB');

  const users = await User.find({ role: 'Student' }).limit(10).lean();
  for (const user of users) {
    console.log(`\n--- Inspecting: ${user.name} ---`);
    console.log(`User ID: ${user._id}`);
    
    const enrollments = await Enrollment.find({ studentId: user._id }).lean();
    console.log(`Total Enrollments: ${enrollments.length}`);
    
    for (const e of enrollments) {
      console.log(`\n  Enrollment ID: ${e._id}`);
      console.log(`  Course ID: ${e.courseId}`);
      console.log(`  Status: ${e.status}`);
      
      if (!e.courseId) {
        console.log(`  !! COURSE ID IS NULL !!`);
        continue;
      }

      const course = await Course.findById(e.courseId).lean();
      if (!course) {
        console.log(`  !! COURSE NOT FOUND !! (Orphaned Enrollment)`);
      } else {
        console.log(`  Course Title: ${course.title}`);
        const lessons = await Lesson.countDocuments({ courseId: e.courseId });
        console.log(`  Total Lessons in Course: ${lessons}`);
      }
      
      const completedCount = e.progress?.completedLessons?.length || 0;
      console.log(`  Completed Lessons Array Length: ${completedCount}`);
      console.log(`  Stored percentComplete: ${e.progress?.percentComplete}`);
    }
  }

  mongoose.disconnect();
}

run().catch(console.error);
