import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Course from './models/Course';
import Enrollment from './models/Enrollment';
import Progress from './models/Progress';
import Payment from './models/Payment';
import Certificate from './models/Certificate';
import QuizResult from './models/QuizResult';

const check = async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const courses = await Course.find();
  for (const course of courses) {
    const enrollments = await Enrollment.countDocuments({ courseId: course._id });
    const progress = await Progress.countDocuments({ courseId: course._id });
    const payments = await Payment.countDocuments({ courseId: course._id });
    const certs = await Certificate.countDocuments({ courseId: course._id });
    const quizResults = await QuizResult.countDocuments({ courseId: course._id });
    
    if (enrollments > 0 || progress > 0 || payments > 0 || certs > 0 || quizResults > 0) {
      console.log(`Course ${course.title} (${course._id}): HAS DEPENDENCIES -> enrollments:${enrollments}, progress:${progress}, payments:${payments}, certs:${certs}, quizResults:${quizResults}`);
    } else {
      console.log(`Course ${course.title} (${course._id}): NO DEPENDENCIES (Can be safely deleted)`);
    }
  }

  process.exit(0);
};

check().catch(console.error);
