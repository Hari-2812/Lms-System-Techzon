import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/User';
import Course from './models/Course';
import Enrollment from './models/Enrollment';
import Lesson from './models/Lesson';
import Progress from './models/Progress';

const check = async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const student = await User.findOne({ email: 'thilakjeshh@gmail.com' });
  if (!student) {
    console.log('Student not found');
    return process.exit(0);
  }
  console.log('Student ID:', student._id);

  const course = await Course.findOne({ title: /Autocad/i });
  if (!course) {
    console.log('Course not found');
    return process.exit(0);
  }
  console.log('Course ID:', course._id);

  const enrollment = await Enrollment.findOne({ studentId: student._id, courseId: course._id });
  console.log('Enrollment:', enrollment);

  const lessons = await Lesson.find({ courseId: course._id });
  console.log('Total Lessons:', lessons.length);

  const progress = await Progress.find({ userId: student._id, courseId: course._id });
  console.log('Progress records:', progress.length);
  console.log('Completed Progress:', progress.filter(p => p.completed).length);

  process.exit(0);
};

check().catch(console.error);
