import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import Course from '../models/Course';
import Module from '../models/Module';
import Lesson from '../models/Lesson';
import Enrollment from '../models/Enrollment';

const validCourses = [
  'AWS',
  'Web Development',
  'Python Full Stack',
  'Machine Learning',
  'DevOps'
]; // Add known good ones, or just delete anything that doesn't have a Bunny collection.
// Actually, it's safer to delete specific bad ones as requested.

const invalidNames = [
  '^A$', '^B$', '^Be$', '^F$', '^T$', '^It$', '^1$', 
  '^Full Stack$', '^Fullstack$', '^Fullstack Development$', '^Python$', '^Machine Learning$'
];

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    const regexArray = invalidNames.map(name => new RegExp(name, 'i'));
    
    // Find courses matching the invalid names
    const coursesToDelete = await Course.find({
      title: { $in: regexArray }
    });

    console.log(`Found ${coursesToDelete.length} invalid courses to delete.`);

    for (const course of coursesToDelete) {
      console.log(`Deleting course: ${course.title} (${course._id})`);
      await Lesson.deleteMany({ courseId: course._id });
      await Module.deleteMany({ courseId: course._id });
      await Enrollment.deleteMany({ courseId: course._id });
      await Course.findByIdAndDelete(course._id);
    }

    console.log('Cleanup complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanup();
