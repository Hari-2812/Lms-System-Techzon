"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackLessonProgress = exports.deleteLesson = exports.updateLesson = exports.createLesson = exports.deleteModule = exports.updateModule = exports.createModule = exports.duplicateCourse = exports.updateCourse = exports.createCourse = exports.getCourseDetails = exports.getCourses = exports.seedDefaultCourses = void 0;
const Course_1 = __importDefault(require("../models/Course"));
const Module_1 = __importDefault(require("../models/Module"));
const Lesson_1 = __importDefault(require("../models/Lesson"));
const Enrollment_1 = __importDefault(require("../models/Enrollment"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const certificateController_1 = require("./certificateController");
const logger_1 = __importDefault(require("../config/logger"));
// Seed default course if needed
const seedDefaultCourses = async () => {
    const count = await Course_1.default.countDocuments();
    if (count > 0)
        return;
    const defaultCourse = new Course_1.default({
        title: 'Full Stack MERN Development',
        slug: 'full-stack-mern-development',
        description: 'Learn modern web engineering using MongoDB, Express, React, and Node.js.',
        category: 'Software Engineering',
        thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=600&auto=format&fit=crop',
        status: 'published',
        seo: {
            title: 'Full Stack MERN Course',
            description: 'Master React, Express, MongoDB, Node',
            keywords: ['MERN', 'Full Stack', 'Web Development'],
        },
    });
    await defaultCourse.save();
    const mod1 = new Module_1.default({
        courseId: defaultCourse._id,
        title: 'Introduction to MongoDB',
        order: 1,
    });
    await mod1.save();
    const les1 = new Lesson_1.default({
        moduleId: mod1._id,
        courseId: defaultCourse._id,
        title: 'MongoDB Basics & Schema Design',
        description: 'Understand document database foundations and Mongoose structures.',
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/c_scale,w_640/dog.mp4',
        videoDuration: 300,
        order: 1,
    });
    await les1.save();
    logger_1.default.info('Default courses seeded successfully.');
};
exports.seedDefaultCourses = seedDefaultCourses;
const getCourses = async (req, res) => {
    try {
        let courses;
        if (['super-admin', 'admin', 'mentor', 'support'].includes(req.user?.role)) {
            courses = await Course_1.default.find().populate('mentors', 'name email');
        }
        else {
            // Students only see courses they are actively enrolled in
            const enrollments = await Enrollment_1.default.find({
                studentId: req.user._id,
                status: 'active',
                expiryDate: { $gt: new Date() },
            }).select('courseId');
            const enrolledCourseIds = enrollments.map((e) => e.courseId);
            courses = await Course_1.default.find({ _id: { $in: enrolledCourseIds } }).populate('mentors', 'name email');
        }
        res.status(200).json({ success: true, data: courses });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getCourses = getCourses;
const getCourseDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const course = await Course_1.default.findById(id).populate('mentors', 'name email');
        if (!course) {
            res.status(404).json({ success: false, message: 'Course not found' });
            return;
        }
        // Fetch modules & lessons
        const modules = await Module_1.default.find({ courseId: course._id }).sort('order');
        const lessons = await Lesson_1.default.find({ courseId: course._id }).sort('order');
        // If student, check progress
        let completedLessons = [];
        if (req.user?.role === 'student') {
            const enrollment = await Enrollment_1.default.findOne({
                studentId: req.user._id,
                courseId: course._id,
            });
            if (enrollment) {
                completedLessons = enrollment.progress.completedLessons.map((l) => l.toString());
            }
        }
        res.status(200).json({
            success: true,
            data: {
                course,
                modules,
                lessons,
                completedLessons,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getCourseDetails = getCourseDetails;
const createCourse = async (req, res) => {
    try {
        const { title } = req.body;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const course = new Course_1.default({ ...req.body, slug });
        await course.save();
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'CREATE_COURSE',
            details: `Created course: ${course.title}`,
        });
        res.status(201).json({ success: true, data: course });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.createCourse = createCourse;
const updateCourse = async (req, res) => {
    const { id } = req.params;
    try {
        const course = await Course_1.default.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!course) {
            res.status(404).json({ success: false, message: 'Course not found' });
            return;
        }
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'UPDATE_COURSE',
            details: `Updated course: ${course.title}`,
        });
        res.status(200).json({ success: true, data: course });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.updateCourse = updateCourse;
const duplicateCourse = async (req, res) => {
    const { id } = req.params;
    try {
        const originalCourse = await Course_1.default.findById(id);
        if (!originalCourse) {
            res.status(404).json({ success: false, message: 'Course not found' });
            return;
        }
        // 1. Duplicate Course Metadata
        const title = `${originalCourse.title} (Copy)`;
        const slug = `${originalCourse.slug}-copy-${Date.now()}`;
        const duplicatedCourse = new Course_1.default({
            title,
            slug,
            description: originalCourse.description,
            category: originalCourse.category,
            thumbnailUrl: originalCourse.thumbnailUrl,
            trailerUrl: originalCourse.trailerUrl,
            mentors: originalCourse.mentors,
            status: 'draft',
        });
        await duplicatedCourse.save();
        // 2. Fetch and duplicate modules
        const modules = await Module_1.default.find({ courseId: originalCourse._id }).sort('order');
        for (const mod of modules) {
            const duplicatedMod = new Module_1.default({
                courseId: duplicatedCourse._id,
                title: mod.title,
                order: mod.order,
            });
            await duplicatedMod.save();
            // 3. Duplicate lessons for this module
            const lessons = await Lesson_1.default.find({ moduleId: mod._id }).sort('order');
            for (const les of lessons) {
                const duplicatedLes = new Lesson_1.default({
                    moduleId: duplicatedMod._id,
                    courseId: duplicatedCourse._id,
                    title: les.title,
                    description: les.description,
                    videoUrl: les.videoUrl,
                    videoDuration: les.videoDuration,
                    notesUrl: les.notesUrl,
                    downloads: les.downloads,
                    order: les.order,
                });
                await duplicatedLes.save();
            }
        }
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'DUPLICATE_COURSE',
            details: `Duplicated course ${originalCourse.title} to ${duplicatedCourse.title}`,
        });
        res.status(201).json({ success: true, data: duplicatedCourse });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.duplicateCourse = duplicateCourse;
// Module CRUD operations
const createModule = async (req, res) => {
    try {
        const mod = new Module_1.default(req.body);
        await mod.save();
        res.status(201).json({ success: true, data: mod });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.createModule = createModule;
const updateModule = async (req, res) => {
    const { id } = req.params;
    try {
        const mod = await Module_1.default.findByIdAndUpdate(id, req.body, { new: true });
        if (!mod) {
            res.status(404).json({ success: false, message: 'Module not found' });
            return;
        }
        res.status(200).json({ success: true, data: mod });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.updateModule = updateModule;
const deleteModule = async (req, res) => {
    const { id } = req.params;
    try {
        const mod = await Module_1.default.findByIdAndDelete(id);
        if (!mod) {
            res.status(404).json({ success: false, message: 'Module not found' });
            return;
        }
        // Delete all lessons under this module
        await Lesson_1.default.deleteMany({ moduleId: mod._id });
        res.status(200).json({ success: true, message: 'Module and associated lessons deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.deleteModule = deleteModule;
// Lesson CRUD operations
const createLesson = async (req, res) => {
    try {
        const lesson = new Lesson_1.default(req.body);
        await lesson.save();
        res.status(201).json({ success: true, data: lesson });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.createLesson = createLesson;
const updateLesson = async (req, res) => {
    const { id } = req.params;
    try {
        const lesson = await Lesson_1.default.findByIdAndUpdate(id, req.body, { new: true });
        if (!lesson) {
            res.status(404).json({ success: false, message: 'Lesson not found' });
            return;
        }
        res.status(200).json({ success: true, data: lesson });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.updateLesson = updateLesson;
const deleteLesson = async (req, res) => {
    const { id } = req.params;
    try {
        const lesson = await Lesson_1.default.findByIdAndDelete(id);
        if (!lesson) {
            res.status(404).json({ success: false, message: 'Lesson not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Lesson deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.deleteLesson = deleteLesson;
// Track student progress
const trackLessonProgress = async (req, res) => {
    const { courseId, lessonId, isCompleted } = req.body;
    if (!courseId || !lessonId) {
        res.status(400).json({ success: false, message: 'Course ID and Lesson ID are required' });
        return;
    }
    try {
        // 1. Fetch enrollment
        const enrollment = await Enrollment_1.default.findOne({ studentId: req.user._id, courseId });
        if (!enrollment) {
            res.status(404).json({ success: false, message: 'Active course enrollment not found' });
            return;
        }
        const completedSet = new Set(enrollment.progress.completedLessons.map((id) => id.toString()));
        if (isCompleted) {
            completedSet.add(lessonId);
        }
        else {
            completedSet.delete(lessonId);
        }
        enrollment.progress.completedLessons = Array.from(completedSet).map((id) => id);
        // Calculate percentage completion
        const totalLessons = await Lesson_1.default.countDocuments({ courseId });
        if (totalLessons > 0) {
            enrollment.progress.percentComplete = Math.round((completedSet.size / totalLessons) * 100);
        }
        else {
            enrollment.progress.percentComplete = 0;
        }
        // Auto-issue certificate on 100% completion
        if (enrollment.progress.percentComplete === 100 && !enrollment.certificateIssued) {
            try {
                const cert = await (0, certificateController_1.generateCertificateOffline)(req.user._id, courseId, enrollment._id);
                enrollment.certificateIssued = true;
                enrollment.certificateId = cert._id;
                logger_1.default.info(`Graduation Certificate auto-issued to ${req.user.email} for course ${courseId}`);
            }
            catch (certErr) {
                logger_1.default.error('Failed to auto-issue certificate:', certErr);
            }
        }
        await enrollment.save();
        res.status(200).json({
            success: true,
            data: {
                percentComplete: enrollment.progress.percentComplete,
                completedLessons: enrollment.progress.completedLessons,
                certificateIssued: enrollment.certificateIssued,
                certificateId: enrollment.certificateId,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Progress tracking error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.trackLessonProgress = trackLessonProgress;
