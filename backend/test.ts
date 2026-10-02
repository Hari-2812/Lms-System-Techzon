process.env.BREVO_API_KEY = 'dummy';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/techzon-lms';
import mongoose from 'mongoose';
import { assignProject } from './controllers/projectAdminController';
import User from './models/User';
import Course from './models/Course';
import Enrollment from './models/Enrollment';
import ProjectAssignment from './models/ProjectAssignment';
import * as emailService from './services/email';

require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/techzon-lms');
  console.log('Connected');

  // Mock request and response
  const adminId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();

  const enrollment = new Enrollment({
    studentId,
    courseId,
    learningPlanId: new mongoose.Types.ObjectId(),
    progress: { percentComplete: 100, completedLessons: [] },
    status: 'completed',
    expiryDate: new Date()
  });
  await enrollment.save();

  // Mock request and response
  const req: any = {
    params: { studentId: studentId.toString() },
    body: {
      courseId: courseId.toString(),
      title: 'Design and Develop a Personal Portfolio Website',
      description: 'Desc',
      instructions: 'Inst',
      projectPdf: 'http://pdf',
      domain: 'Web Development',
      projectType: 'MINOR',
      requirements: [],
      batch: 'General'
    },
    user: { _id: adminId }
  };

  const res: any = {
    status: function(s: number) {
      this.statusCode = s;
      return this;
    },
    json: function(data: any) {
      console.log('Response:', this.statusCode, data);
    }
  };

  try {
    await assignProject(req, res);
  } catch(e) {
    console.error('Unhandled Error:', e);
  }
  
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}
run();
