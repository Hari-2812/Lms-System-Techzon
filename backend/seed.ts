import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env before models
dotenv.config({ path: path.join(__dirname, '.env') });

import User from './models/User';
import LearningPlan from './models/LearningPlan';
import Course from './models/Course';
import Module from './models/Module';
import Lesson from './models/Lesson';
import Enrollment from './models/Enrollment';
import LiveClass from './models/LiveClass';
import Settings from './models/Settings';
import AuditLog from './models/AuditLog';
import Onboarding from './models/Onboarding';

const seedDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully.');

    // 1. Clear existing database collections
    console.log('Wiping existing data collections...');
    await Promise.all([
      User.deleteMany({}),
      LearningPlan.deleteMany({}),
      Course.deleteMany({}),
      Module.deleteMany({}),
      Lesson.deleteMany({}),
      Enrollment.deleteMany({}),
      LiveClass.deleteMany({}),
      Settings.deleteMany({}),
      AuditLog.deleteMany({}),
      Onboarding.deleteMany({}),
    ]);
    console.log('Database wiped clean.');

    // 2. Seed Settings
    console.log('Seeding global system settings...');
    const settings = new Settings({
      appName: 'Techzon LMS System',
      companyName: 'Techzon Wide',
      supportEmail: 'support@techzonwide.com',
      supportNumber: '+91 6374191654',
      maintenanceMode: false,
    });
    await settings.save();

    // 3. Seed Learning Plans
    console.log('Seeding subscription tiers...');
    const plans = await LearningPlan.insertMany([
      {
        name: 'Self-Paced Learning',
        code: 'self-paced',
        price: 2499,
        durationMonths: 6,
        features: {
          recordedClasses: true,
          pdfsAndNotes: true,
          quizzes: true,
          assignments: true,
          communitySupport: true,
          certificates: true,
          liveClasses: false,
          mentorSessions: false,
          doubtClearing: false,
          careerGuidance: false,
          mockInterviews: false,
          resumeReview: false,
          placementSupport: false,
          projectsCount: 2,
        },
      },
      {
        name: 'Mentor-Led Learning',
        code: 'mentor-led',
        price: 5499,
        durationMonths: 6,
        features: {
          recordedClasses: true,
          pdfsAndNotes: true,
          quizzes: true,
          assignments: true,
          communitySupport: true,
          certificates: true,
          liveClasses: true,
          mentorSessions: true,
          doubtClearing: true,
          careerGuidance: true,
          mockInterviews: false,
          resumeReview: false,
          placementSupport: false,
          projectsCount: 4,
        },
      },
      {
        name: 'Advanced Mentor Plan',
        code: 'advanced-mentor',
        price: 14999,
        durationMonths: 12,
        features: {
          recordedClasses: true,
          pdfsAndNotes: true,
          quizzes: true,
          assignments: true,
          communitySupport: true,
          certificates: true,
          liveClasses: true,
          mentorSessions: true,
          doubtClearing: true,
          careerGuidance: true,
          mockInterviews: true,
          resumeReview: true,
          placementSupport: true,
          projectsCount: 6,
        },
      },
    ]);
    const selfPacedPlan = plans[0];
    const mentorPlan = plans[1];

    // 4. Seed Default Administrator
    console.log('Seeding default administrator account...');
    const adminUser = new User({
      name: 'Super Admin',
      email: 'admin@techzonwide.com',
      password: 'Admin@123',
      role: 'SuperAdmin',
      status: 'active',
      isEmailVerified: true,
    });
    await adminUser.save();

    console.log('Database seeded successfully with minimal initial records.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding process encountered error:', error);
    process.exit(1);
  }
};

seedDatabase();
