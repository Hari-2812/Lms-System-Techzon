import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import Course from '../models/Course';
import Module from '../models/Module';
import Lesson from '../models/Lesson';
import Video from '../models/Video';
import Enrollment from '../models/Enrollment';
import Progress from '../models/Progress';
import AuditLog from '../models/AuditLog';
import { generateCertificateOffline } from './certificateController';
import mongoose from 'mongoose';
import { BunnyService } from '../services/bunnyService';
import logger from '../config/logger';

export const getCourses = async (req: any, res: Response): Promise<void> => {
  try {
    let courses;
    if (['SuperAdmin', 'Admin', 'Mentor', 'Support'].includes(req.user?.role)) {
      const rawCourses = await Course.find().populate('mentors', 'name email').lean();
      courses = await Promise.all(rawCourses.map(async (course) => {
        const studentCount = await Enrollment.countDocuments({ courseId: course._id, status: 'active' });
        const lessonCount = await Lesson.countDocuments({ courseId: course._id, legacy: { $ne: true } });
        return { ...course, studentCount, lessonCount };
      }));
    } else {
      // Students only see courses they are actively enrolled in
      const enrollments = await Enrollment.find({
        studentId: req.user._id,
        status: 'active',
        expiryDate: { $gt: new Date() },
      }).select('courseId');

      const enrolledCourseIds = enrollments.map((e) => e.courseId);
      courses = await Course.find({ _id: { $in: enrolledCourseIds } }).populate('mentors', 'name email').lean();
    }

    res.status(200).json({ success: true, data: courses });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getCourseDetails = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const course = await Course.findById(id).populate('mentors', 'name email').lean();
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    // If student, verify active enrollment before exposing course details
    if (req.user?.role === 'Student') {
      const enrollment = await Enrollment.findOne({
        studentId: req.user._id,
        courseId: course._id,
        status: 'active',
        expiryDate: { $gt: new Date() },
      });
      if (!enrollment) {
        res.status(403).json({ success: false, message: 'Access denied to this course.' });
        return;
      }
    }

    // Fetch modules & lessons
    let modules = await Module.find({ courseId: course._id }).sort('order').lean();
    let lessons = await Lesson.find({ courseId: course._id, legacy: { $ne: true } })
      .populate('videoId')
      .populate('moduleId')
      .populate('courseId')
      .sort('order')
      .lean();

    let completedLessons: string[] = [];
    if (req.user?.role === 'Student') {
      const enrollment = await Enrollment.findOne({
        studentId: req.user._id,
        courseId: course._id,
      });
      if (enrollment) {
        completedLessons = enrollment.progress.completedLessons.map((l) => l.toString());
      }
    }


    const modulesWithLessons = modules.map((mod: any) => ({
      ...mod,
      lessons: lessons.filter((lesson: any) => {
        const lessonModId = lesson.moduleId && lesson.moduleId._id ? lesson.moduleId._id.toString() : lesson.moduleId.toString();
        return lessonModId === mod._id.toString();
      }),
    }));

    res.status(200).json({
      success: true,
      data: {
        course,
        modules: modulesWithLessons,
        lessons,
        completedLessons,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createCourse = async (req: any, res: Response): Promise<void> => {
  try {
    const { title } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const course = new Course({ ...req.body, slug });
    await course.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'CREATE_COURSE',
      details: `Created course: ${course.title}`,
    });

    res.status(201).json({ success: true, data: course });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};



export const updateCourse = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const course = await Course.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'UPDATE_COURSE',
      details: `Updated course: ${course.title}`,
    });

    res.status(200).json({ success: true, data: course });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const duplicateCourse = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const originalCourse = await Course.findById(id);
    if (!originalCourse) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    // 1. Duplicate Course Metadata
    const title = `${originalCourse.title} (Copy)`;
    const slug = `${originalCourse.slug}-copy-${Date.now()}`;
    const duplicatedCourse = new Course({
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
    const modules = await Module.find({ courseId: originalCourse._id }).sort('order');
    for (const mod of modules) {
      const duplicatedMod = new Module({
        courseId: duplicatedCourse._id,
        title: mod.title,
        order: mod.order,
      });
      await duplicatedMod.save();

      // 3. Duplicate lessons for this module
      const lessons = await Lesson.find({ moduleId: mod._id }).sort('order');
      for (const les of lessons) {
        const duplicatedLes = new Lesson({
          moduleId: duplicatedMod._id,
          courseId: duplicatedCourse._id,
          title: les.title,
          description: les.description,
          videoId: les.videoId,
          notesUrl: les.notesUrl,
          downloads: les.downloads,
          order: les.order,
        });
        await duplicatedLes.save();
      }
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'DUPLICATE_COURSE',
      details: `Duplicated course ${originalCourse.title} to ${duplicatedCourse.title}`,
    });

    res.status(201).json({ success: true, data: duplicatedCourse });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Module CRUD operations
export const createModule = async (req: Request, res: Response): Promise<void> => {
  try {
    const mod = new Module(req.body);
    await mod.save();
    res.status(201).json({ success: true, data: mod });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateModule = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const mod = await Module.findByIdAndUpdate(id, req.body, { new: true });
    if (!mod) {
      res.status(404).json({ success: false, message: 'Module not found' });
      return;
    }
    res.status(200).json({ success: true, data: mod });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteModule = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const mod = await Module.findByIdAndDelete(id);
    if (!mod) {
      res.status(404).json({ success: false, message: 'Module not found' });
      return;
    }
    // Delete all lessons under this module
    await Lesson.deleteMany({ moduleId: mod._id });
    res.status(200).json({ success: true, message: 'Module and associated lessons deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Lesson CRUD operations
export const createLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const lesson = new Lesson(req.body);
    await lesson.save();
    res.status(201).json({ success: true, data: lesson });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateLesson = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const lesson = await Lesson.findByIdAndUpdate(id, req.body, { new: true });
    if (!lesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }
    res.status(200).json({ success: true, data: lesson });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteLesson = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const lesson = await Lesson.findByIdAndDelete(id);
    if (!lesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Track student progress with sequential validation
export const trackLessonProgress = async (req: any, res: Response): Promise<void> => {
  const { courseId, lessonId, isCompleted } = req.body;
  
  console.log(`Completion API Hit`);
  console.log(`Student ID: ${req.user._id}`);
  console.log(`Course ID: ${courseId}`);
  console.log(`Lesson ID: ${lessonId}`);

  if (!courseId || !lessonId) {
    res.status(400).json({ success: false, message: 'Course ID and Lesson ID are required' });
    return;
  }

  try {
    // 1. Fetch enrollment
    const enrollment = await Enrollment.findOne({ studentId: req.user._id, courseId });
    if (!enrollment) {
      res.status(404).json({ success: false, message: 'Active course enrollment not found' });
      return;
    }
    console.log(`Enrollment ID: ${enrollment._id}`);
    console.log(`Enrollment Found`);

    // 2. Fetch all lessons sorted by order to validate sequence
    const allLessons = await Lesson.find({ courseId }).sort('order').lean();
    const currentLessonIndex = allLessons.findIndex(l => l._id.toString() === lessonId);
    
    if (currentLessonIndex === -1) {
      res.status(404).json({ success: false, message: 'Lesson not found in this course' });
      return;
    }
    console.log(`Lesson Found`);

    if (isCompleted) {
      console.log(`Current Progress: ${enrollment.progress.percentComplete}%`);
      console.log(`Saving Completion`);
      
      // 3. Sequential Lock Validation: Only allow if it's the first lesson OR previous lesson is completed
      if (currentLessonIndex > 0) {
        const previousLesson = allLessons[currentLessonIndex - 1];
        const isPrevCompleted = enrollment.progress.completedLessons.some(
          (id: any) => id.toString() === previousLesson._id.toString()
        );
        if (!isPrevCompleted) {
          console.log(`[BACKEND] Error: Previous lesson not completed`);
          res.status(403).json({ 
            success: false, 
            message: 'You must complete previous lessons before marking this as complete.' 
          });
          return;
        }
      }

      // 4. Atomically add to set in Enrollment
      await Enrollment.updateOne(
        { _id: enrollment._id },
        { $addToSet: { 'progress.completedLessons': lessonId } }
      );

      // Sync with Progress model explicitly for this user/lesson
      await Progress.findOneAndUpdate(
        { userId: req.user._id, lessonId },
        { 
          courseId, 
          isCompleted: true, 
          completionPercentage: 100,
          currentTime: 0,
          lastWatched: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`Mongo Save Success`);
    } else {
      // Remove lesson completion if unchecked (optional but handled)
      await Enrollment.updateOne(
        { _id: enrollment._id },
        { $pull: { 'progress.completedLessons': lessonId } }
      );
      await Progress.findOneAndUpdate(
        { userId: req.user._id, lessonId },
        { isCompleted: false, completionPercentage: 0 }
      );
    }

    // 5. Recalculate progress
    const updatedEnrollment = await Enrollment.findById(enrollment._id);
    if (!updatedEnrollment) {
      return;
    }

    const totalLessons = allLessons.length;
    const completedCount = updatedEnrollment.progress.completedLessons.length;
    const newPercent = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

    updatedEnrollment.progress.percentComplete = newPercent;
    console.log(`Progress Calculated`);
    
    // Auto-issue certificate if 100%
    if (newPercent === 100 && !updatedEnrollment.certificateIssued) {
      try {
        const cert = await generateCertificateOffline(req.user._id, courseId, updatedEnrollment._id);
        updatedEnrollment.certificateIssued = true;
        updatedEnrollment.certificateId = cert.certificateId;
      } catch (certErr) {
        logger.error('Failed to auto-issue certificate:', certErr);
      }
    }

    await updatedEnrollment.save();

    // Determine the next lesson to unlock dynamically
    let nextLessonId = null;
    let nextLessonUnlocked = false;
    if (currentLessonIndex < totalLessons - 1) {
      nextLessonId = allLessons[currentLessonIndex + 1]._id;
      nextLessonUnlocked = true;
      console.log(`Next Lesson: ${nextLessonId}`);
      console.log(`Lesson Unlocked`);
    }

    console.log(`Response Sent`);
    res.status(200).json({
      success: true,
      completed: true,
      unlockNextLesson: nextLessonUnlocked,
      nextLessonUnlocked: nextLessonUnlocked,
      courseProgress: updatedEnrollment.progress.percentComplete,
      courseCompleted: newPercent === 100,
      nextLessonId: nextLessonId,
      data: {
        percentComplete: updatedEnrollment.progress.percentComplete,
        completedLessons: updatedEnrollment.progress.completedLessons,
        certificateIssued: updatedEnrollment.certificateIssued,
        certificateId: updatedEnrollment.certificateId,
        nextLessonId: nextLessonId
      },
    });
  } catch (error: any) {
    logger.error('Progress tracking error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};



export const deleteCourse = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const course = await Course.findById(id);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    // Cascade delete related records securely
    await Video.deleteMany({ courseId: id });
    await Lesson.deleteMany({ courseId: id });
    await Module.deleteMany({ courseId: id });
    await Course.findByIdAndDelete(id);

    // Note: We intentionally do not delete Cloudinary assets per instructions.
    // We intentionally leave Enrollments intact or let the frontend display "No courses assigned" if they get orphaned,
    // though typically admins manage enrollments manually via the new updateStudentEnrollments endpoint.

    logger.info(`Course ${course.title} and all its modules, lessons, and video references were deleted by Admin ${req.user._id}.`);

    res.status(200).json({ success: true, message: 'Course deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting course:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const syncBunnyLibrary = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Connecting Bunny Library');
    const videos = await BunnyService.syncLibrary();
    console.log(`Videos Found: ${videos.length}`);
    console.log('Matching Lessons');

    let updatedCount = 0;

    for (const video of videos) {
      // Strip common extensions from the video title to match the lesson
      const videoName = video.title.replace(/\.(mp4|mov|avi|wmv|flv|mkv)$/i, '').trim();

      // Find the lesson (case insensitive match on title)
      // or if bunnyVideoId is already present (from previous manual assignment)
      const lesson = await Lesson.findOne({
        $or: [
          { title: new RegExp(`^${videoName}$`, 'i') },
          { bunnyVideoId: video.guid }
        ]
      });

      if (lesson) {
        lesson.provider = 'bunny';
        lesson.bunnyVideoId = video.guid;
        lesson.playbackUrl = BunnyService.getPlaybackUrl(video.guid);
        lesson.thumbnailUrl = BunnyService.getThumbnail(video.guid);
        lesson.duration = video.length;
        await lesson.save();
        updatedCount++;
        console.log(`Lesson Updated: ${lesson.title}`);
      }
    }

    console.log('Sync Completed');
    res.status(200).json({ success: true, data: { updatedCount } });
  } catch (error: any) {
    console.error('Error in syncBunnyLibrary:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
