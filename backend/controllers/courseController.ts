import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import Course from '../models/Course';
import Module from '../models/Module';
import Lesson from '../models/Lesson';
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
    let progressMap: Record<string, any> = {};
    if (req.user?.role === 'Student') {
      const enrollment = await Enrollment.findOne({
        studentId: req.user._id,
        courseId: course._id,
      });
      if (enrollment) {
        completedLessons = enrollment.progress.completedLessons.map((l) => l.toString());
      }
      
      const allProgress = await Progress.find({
        userId: req.user._id,
        courseId: course._id
      }).lean();
      
      allProgress.forEach((p: any) => {
        progressMap[p.lessonId.toString()] = {
          lastPlaybackPosition: p.lastPlaybackPosition,
          watchedPercentage: p.watchedPercentage,
          completedAt: p.completedAt
        };
      });
    }

    const enhancedLessons = lessons.map((les: any, index: number) => {
      const isCompleted = completedLessons.includes(les._id.toString());
      const isLocked = index > 0 && !completedLessons.includes(lessons[index - 1]._id.toString());
      const pData = progressMap[les._id.toString()] || {};
      
      return {
        ...les,
        completed: isCompleted,
        locked: req.user?.role === 'Student' ? isLocked : false,
        isCompleted, // Keep for legacy frontend logic temporarily
        isLocked: req.user?.role === 'Student' ? isLocked : false,
        lastPlaybackPosition: pData.lastPlaybackPosition || 0,
        watchedPercentage: pData.watchedPercentage || 0,
        completedAt: pData.completedAt || null
      };
    });


    const modulesWithLessons = modules.map((mod: any) => ({
      ...mod,
      lessons: enhancedLessons.filter((lesson: any) => {
        const lessonModId = lesson.moduleId && lesson.moduleId._id ? lesson.moduleId._id.toString() : lesson.moduleId.toString();
        return lessonModId === mod._id.toString();
      }),
    }));

    // Calculate sequential metrics
    let currentLesson = null;
    let nextLesson = null;
    let courseProgress = 0;
    let lockedLessons: string[] = [];
    
    if (req.user?.role === 'Student') {
      const total = enhancedLessons.length;
      if (total > 0) {
        courseProgress = Math.round((completedLessons.length / total) * 100);
      }
      
      const firstUncompletedIndex = enhancedLessons.findIndex((l: any) => !l.completed);
      if (firstUncompletedIndex !== -1) {
        currentLesson = enhancedLessons[firstUncompletedIndex];
        if (firstUncompletedIndex + 1 < enhancedLessons.length) {
          nextLesson = enhancedLessons[firstUncompletedIndex + 1];
        }
      }
      
      lockedLessons = enhancedLessons.filter((l: any) => l.locked).map((l: any) => l._id.toString());
    }

    res.status(200).json({
      success: true,
      data: {
        course,
        modules: modulesWithLessons,
        lessons: enhancedLessons,
        completedLessons,
        courseProgress,
        lockedLessons,
        currentLesson,
        nextLesson
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
  const { courseId, lessonId, isCompleted, currentTime, watchedPercentage } = req.body;
  
  console.log(`Completion API Hit`);
  console.log(`Student ID: ${req.user._id}`);
  console.log(`Course ID: ${courseId}`);
  console.log(`Lesson ID: ${lessonId}`);

  if (!courseId || !lessonId) {
    res.status(400).json({ success: false, message: 'Course ID and Lesson ID are required' });
    return;
  }

  try {
    const objCourseId = new mongoose.Types.ObjectId(courseId);
    const objLessonId = new mongoose.Types.ObjectId(lessonId);

    // 1. Fetch enrollment
    const enrollment = await Enrollment.findOne({ studentId: req.user._id, courseId: objCourseId });
    if (!enrollment) {
      res.status(404).json({ success: false, message: 'Active course enrollment not found' });
      return;
    }
    console.log(`Enrollment ID: ${enrollment._id}`);
    console.log(`Enrollment Found`);

    // 2. Fetch all lessons sorted by order to validate sequence
    const allLessons = await Lesson.find({ courseId: objCourseId }).sort('order').lean();
    console.log(`[DEBUG] Lesson Order Retrieved`);
    const currentLessonIndex = allLessons.findIndex(l => l._id.toString() === lessonId);
    
    if (currentLessonIndex === -1) {
      res.status(404).json({ success: false, message: 'Lesson not found in this course' });
      return;
    }

    if (isCompleted) {
      console.log(`[DEBUG] Lesson Completion Triggered`);
      
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
        { $addToSet: { 'progress.completedLessons': objLessonId } }
      );

      // Sync with Progress model explicitly for this user/lesson
      await Progress.findOneAndUpdate(
        { userId: req.user._id, lessonId: objLessonId },
        { 
          courseId: objCourseId, 
          completed: true, 
          watchedPercentage: watchedPercentage || 100,
          lastPlaybackPosition: currentTime || 0,
          completedAt: new Date(),
          lastWatched: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`[DEBUG] Mongo Progress Updated`);
    } else {
      // Just update progress
      await Progress.findOneAndUpdate(
        { userId: req.user._id, lessonId: objLessonId },
        { 
          courseId: objCourseId,
          lastPlaybackPosition: currentTime || 0,
          watchedPercentage: watchedPercentage || 0,
          lastWatched: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
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
    console.log(`[DEBUG] Course Progress Calculated: ${newPercent}%`);
    
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

    if (newPercent === 100) {
      updatedEnrollment.status = 'completed';
    }

    await updatedEnrollment.save();

    // Determine the next lesson to unlock dynamically
    let nextLessonId = null;
    let nextLessonUnlocked = false;
    if (currentLessonIndex < totalLessons - 1) {
      nextLessonId = allLessons[currentLessonIndex + 1]._id;
      nextLessonUnlocked = true;
      console.log(`[DEBUG] Next Lesson Unlocked: ${nextLessonId}`);
    }

    console.log(`[DEBUG] API Response Sent`);
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
  console.log('Starting Bunny Sync');
  
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || '';
  const apiKey = process.env.BUNNY_STREAM_API_KEY || '';
  
  let videos: any[] = [];
  let collections: any[] = [];
  try {
    const data = await BunnyService.syncLibrary();
    videos = data.videos;
    collections = data.collections;
    
    console.log('Library Loaded');
    console.log(`Collections Found: ${collections.length}`);
  } catch (err: any) {
    console.log('Bunny API Error');
    console.error(err.message);
    console.error(err.stack);
    console.error(err.status);
    console.error(err.responseBody);
    
    res.status(500).json({ 
      success: false, 
      message: err.message,
      details: err.responseBody || null,
      stack: err.stack 
    });
    return;
  }

  let coursesSynced = 0;
  let lessonsAdded = 0;
  let lessonsUpdated = 0;
  let lessonsRemoved = 0;
  let errors: string[] = [];

  for (const collection of collections) {
    const collectionName = collection.name;
    
    // Step 3: Find or Create LMS Course
    let course = await Course.findOne({ title: new RegExp(`^${collectionName}$`, 'i') });
    if (!course) {
      course = new Course({
        title: collectionName,
        slug: collectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: `Imported from Bunny Collection: ${collectionName}`,
        category: collectionName,
        status: 'published'
      });
      await course.save();
      console.log(`Course Created: ${course.title}`);
    } else {
      console.log(`Course Found: ${course.title}`);
    }
    coursesSynced++;

    // Ensure at least one module exists for this course
    let moduleDoc = await Module.findOne({ courseId: course._id }).sort('order');
    if (!moduleDoc) {
      moduleDoc = new Module({
        courseId: course._id,
        title: 'Lessons',
        order: 1
      });
      await moduleDoc.save();
      console.log(`Module Created: Lessons`);
    }

    // Filter videos for this collection
    const collectionVideos = videos.filter(v => v.collectionId === collection.guid);
    collectionVideos.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
    const bunnyVideoIdsInCollection = new Set(collectionVideos.map(v => v.guid));

    let order = 1;
    for (const video of collectionVideos) {
      const videoName = video.title.replace(/\.(mp4|mov|avi|wmv|flv|mkv)$/i, '').trim();
      
      try {
        let lesson = await Lesson.findOne({ courseId: course._id, bunnyVideoId: video.guid });
        
        if (!lesson) {
          lesson = await Lesson.findOne({ courseId: course._id, title: new RegExp(`^${videoName}$`, 'i') });
        }

        if (lesson) {
          lesson.title = videoName;
          lesson.playbackUrl = BunnyService.getPlaybackUrl(video.guid);
          lesson.thumbnailUrl = BunnyService.getThumbnail(video.guid);
          lesson.duration = video.length;
          lesson.videoStatus = video.status;
          lesson.order = order++;
          await lesson.save();
          lessonsUpdated++;
          console.log(`Lesson Updated: ${lesson.title}`);
        } else {
          lesson = new Lesson({
            courseId: course._id,
            moduleId: moduleDoc._id,
            title: videoName,
            provider: 'bunny',
            bunnyVideoId: video.guid,
            playbackUrl: BunnyService.getPlaybackUrl(video.guid),
            thumbnailUrl: BunnyService.getThumbnail(video.guid),
            duration: video.length,
            videoStatus: video.status,
            order: order++,
          });
          await lesson.save();
          lessonsAdded++;
          console.log(`Lesson Added: ${lesson.title}`);
        }
      } catch (lessonErr: any) {
        errors.push(`Error syncing lesson ${videoName}: ${lessonErr.message}`);
      }
    }

    // Step 5: Delete ONLY lessons that no longer exist in Bunny
    const allCourseLessons = await Lesson.find({ courseId: course._id, provider: 'bunny' });
    for (const l of allCourseLessons) {
      if (l.bunnyVideoId && !bunnyVideoIdsInCollection.has(l.bunnyVideoId)) {
        await Lesson.findByIdAndDelete(l._id);
        lessonsRemoved++;
        console.log(`Lesson Removed: ${l.title}`);
      }
    }
  }

  console.log('Matching Courses complete');
  console.log('Updating Lessons complete');
  console.log('Deleting Removed Lessons complete');
  console.log('Sync Complete');
  
  res.status(200).json({
    success: true,
    coursesSynced,
    lessonsAdded,
    lessonsUpdated,
    lessonsRemoved,
    errors: errors
  });
};
