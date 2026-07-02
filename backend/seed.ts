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

    // 4. Seed Default Developer Users
    console.log('Seeding seed profiles (Super Admin, Mentor, Student)...');
    const adminUser = new User({
      name: 'Super Admin',
      email: 'admin@techzonwide.com',
      password: 'Admin@123',
      role: 'super-admin',
      status: 'active',
      isEmailVerified: true,
    });
    await adminUser.save();

    const mentorUser = new User({
      name: 'Instructor Mentor',
      email: 'mentor@techzonwide.com',
      password: 'Mentor@123',
      role: 'mentor',
      status: 'active',
      isEmailVerified: true,
    });
    await mentorUser.save();

    const studentUser = new User({
      name: 'Test Student',
      email: 'student@techzonwide.com',
      password: 'Student@123',
      role: 'student',
      status: 'active',
      isEmailVerified: true,
    });
    await studentUser.save();

    // 5. Seed Sample Course
    console.log('Seeding sample React/Node courses...');
    const course = new Course({
      title: 'Full Stack MERN Development',
      slug: 'full-stack-mern-development',
      description: 'Learn modern web engineering using MongoDB, Express, React, and Node.js.',
      category: 'Software Engineering',
      thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=600&auto=format&fit=crop',
      mentors: [mentorUser._id],
      status: 'published',
      seo: {
        title: 'Full Stack MERN Course',
        description: 'Master React, Express, MongoDB, Node',
        keywords: ['MERN', 'Full Stack', 'Web Development'],
      },
    });
    await course.save();

    // 6. Seed Sample Module & Lesson
    console.log('Seeding modules and recorded lectures...');
    const moduleItem = new Module({
      courseId: course._id,
      title: 'Introduction to MongoDB',
      order: 1,
    });
    await moduleItem.save();

    const lessonItem = new Lesson({
      moduleId: moduleItem._id,
      courseId: course._id,
      title: 'MongoDB Basics & Schema Design',
      description: 'Understand document database foundations and Mongoose structures.',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/c_scale,w_640/dog.mp4',
      videoDuration: 300,
      order: 1,
    });
    await lessonItem.save();

    // 7. Seed Student Course Enrollment
    console.log('Seeding active course enrollments...');
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(startDate.getMonth() + selfPacedPlan.durationMonths);

    const enrollment = new Enrollment({
      studentId: studentUser._id,
      courseId: course._id,
      learningPlanId: selfPacedPlan._id,
      batch: 'Batch A',
      mentorId: mentorUser._id,
      startDate,
      expiryDate,
      progress: { completedLessons: [], percentComplete: 0 },
      status: 'active',
    });
    await enrollment.save();

    // 8. Seed Sample Live Class
    console.log('Seeding webinars...');
    const scheduledTime = new Date();
    scheduledTime.setDate(scheduledTime.getDate() + 2); // 2 days in future

    const liveClass = new LiveClass({
      title: 'Live Q&A Session - MERN Architecture',
      description: 'Join us live to resolve MERN schema queries.',
      courseId: course._id,
      mentorId: mentorUser._id,
      meetingPlatform: 'google-meet',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      scheduledTime,
      durationMinutes: 60,
      status: 'scheduled',
    });
    await liveClass.save();

    // 9. Seed Sample Onboarding Requests
    console.log('Seeding sample onboarding requests...');
    await Onboarding.insertMany([
      {
        fullName: 'Jane Doe',
        email: 'jane.doe@example.com',
        phone: '+919988776655',
        college: 'PSG College of Technology',
        degree: 'B.E. Computer Science',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        courses: [course._id],
        learningPlan: selfPacedPlan._id,
        preferredBatch: 'Batch A',
        status: 'pending',
      },
      {
        fullName: 'Arun Kumar',
        email: 'arun@example.com',
        phone: '+918877665544',
        college: 'IIT Madras',
        degree: 'B.Tech Electrical',
        city: 'Chennai',
        state: 'Tamil Nadu',
        courses: [course._id],
        learningPlan: mentorPlan._id,
        preferredBatch: 'Batch B',
        status: 'pending',
        preferredMentor: mentorUser._id,
      },
      {
        fullName: 'Rahul Sharma',
        email: 'rahul@example.com',
        phone: '+917766554433',
        college: 'BITS Pilani',
        degree: 'M.Sc Physics',
        city: 'Hyderabad',
        state: 'Telangana',
        courses: [course._id],
        learningPlan: selfPacedPlan._id,
        preferredBatch: 'Batch A',
        status: 'rejected',
        remarks: 'Incomplete application forms data.',
        approvedBy: adminUser._id,
        approvedAt: new Date(),
      },
    ]);

    console.log('Database seeded successfully with test records!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding process encountered error:', error);
    process.exit(1);
  }
};

seedDatabase();
