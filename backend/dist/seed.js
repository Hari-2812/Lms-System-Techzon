"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env before models
dotenv_1.default.config({ path: path_1.default.join(__dirname, '.env') });
const User_1 = __importDefault(require("./models/User"));
const LearningPlan_1 = __importDefault(require("./models/LearningPlan"));
const Course_1 = __importDefault(require("./models/Course"));
const Module_1 = __importDefault(require("./models/Module"));
const Lesson_1 = __importDefault(require("./models/Lesson"));
const Enrollment_1 = __importDefault(require("./models/Enrollment"));
const LiveClass_1 = __importDefault(require("./models/LiveClass"));
const Settings_1 = __importDefault(require("./models/Settings"));
const AuditLog_1 = __importDefault(require("./models/AuditLog"));
const Onboarding_1 = __importDefault(require("./models/Onboarding"));
const seedDatabase = async () => {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI is not defined in environment variables');
        process.exit(1);
    }
    try {
        console.log('Connecting to database for seeding...');
        await mongoose_1.default.connect(mongoUri);
        console.log('MongoDB connected successfully.');
        // 1. Clear existing database collections
        console.log('Wiping existing data collections...');
        await Promise.all([
            User_1.default.deleteMany({}),
            LearningPlan_1.default.deleteMany({}),
            Course_1.default.deleteMany({}),
            Module_1.default.deleteMany({}),
            Lesson_1.default.deleteMany({}),
            Enrollment_1.default.deleteMany({}),
            LiveClass_1.default.deleteMany({}),
            Settings_1.default.deleteMany({}),
            AuditLog_1.default.deleteMany({}),
            Onboarding_1.default.deleteMany({}),
        ]);
        console.log('Database wiped clean.');
        // 2. Seed Settings
        console.log('Seeding global system settings...');
        const settings = new Settings_1.default({
            appName: 'Techzon LMS System',
            companyName: 'Techzon Wide',
            supportEmail: 'support@techzonwide.com',
            supportNumber: '+91 6374191654',
            maintenanceMode: false,
        });
        await settings.save();
        // 3. Seed Learning Plans
        console.log('Seeding subscription tiers...');
        const plans = await LearningPlan_1.default.insertMany([
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
        const adminUser = new User_1.default({
            name: 'Super Admin',
            email: 'admin@techzonwide.com',
            password: 'Admin@123',
            role: 'SuperAdmin',
            status: 'active',
            isEmailVerified: true,
        });
        await adminUser.save();
        const mentorUser = new User_1.default({
            name: 'Instructor Mentor',
            email: 'mentor@techzonwide.com',
            password: 'Mentor@123',
            role: 'mentor',
            status: 'active',
            isEmailVerified: true,
        });
        await mentorUser.save();
        const studentUser = new User_1.default({
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
        const course = new Course_1.default({
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
        const moduleItem = new Module_1.default({
            courseId: course._id,
            title: 'Introduction to MongoDB',
            order: 1,
        });
        await moduleItem.save();
        const lessonItem = new Lesson_1.default({
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
        const enrollment = new Enrollment_1.default({
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
        const liveClass = new LiveClass_1.default({
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
        await Onboarding_1.default.insertMany([
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
    }
    catch (error) {
        console.error('Seeding process encountered error:', error);
        process.exit(1);
    }
};
seedDatabase();
