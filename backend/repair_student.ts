import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/User';
import Course from './models/Course';
import Enrollment from './models/Enrollment';
import Lesson from './models/Lesson';
import Progress from './models/Progress';

const repair = async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const student = await User.findOne({ email: 'thilakjeshh@gmail.com' });
  if (!student) {
    console.log('Student not found');
    return process.exit(0);
  }

  const course = await Course.findOne({ title: /Autocad/i });
  if (!course) {
    console.log('Course not found');
    return process.exit(0);
  }

  const enrollment = await Enrollment.findOne({ studentId: student._id, courseId: course._id });
  if (!enrollment) {
    console.log('Enrollment not found');
    return process.exit(0);
  }

  const lessons = await Lesson.find({ courseId: course._id });
  const totalLessons = lessons.length;

  const progress = await Progress.find({ userId: student._id, courseId: course._id });
  const completedRecords = progress.filter(p => p.completed);

  const completedCount = completedRecords.length;
  const percentComplete = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  console.log(`Before Repair: status=${enrollment.status}, percentComplete=${enrollment.progress.percentComplete}, accessVerified=${enrollment.accessVerified}`);

  enrollment.status = percentComplete >= 100 ? 'completed' : 'active';
  enrollment.progress.percentComplete = percentComplete;
  enrollment.accessVerified = true;
  enrollment.accessVerifiedAt = new Date();
  
  // Set completed lessons to match existing progress
  enrollment.progress.completedLessons = completedRecords.map(p => p.lessonId) as any;
  
  if (percentComplete < 100) {
    enrollment.certificateIssued = false;
  }

  await enrollment.save();

  console.log(`After Repair: status=${enrollment.status}, percentComplete=${enrollment.progress.percentComplete}, accessVerified=${enrollment.accessVerified}`);

  process.exit(0);
};

repair().catch(console.error);
