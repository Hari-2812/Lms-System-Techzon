import { Request, Response } from 'express';
import Progress from '../models/Progress';
import Enrollment from '../models/Enrollment';
import Lesson from '../models/Lesson';
import Course from '../models/Course';
import logger from '../config/logger';
import mongoose from 'mongoose';
import { getVideoAccessStatuses } from '../utils/unlockHelper';

export const updateProgress = async (req: any, res: Response): Promise<void> => {
  const { courseId, lessonId, currentTime, duration, watchedPercentage } = req.body;
  
  if (!courseId || !lessonId) {
    res.status(400).json({ success: false, message: 'Course ID and Lesson ID are required' });
    return;
  }

  try {
    const objCourseId = new mongoose.Types.ObjectId(courseId);
    const objLessonId = new mongoose.Types.ObjectId(lessonId);

    // Fetch current progress first to avoid overriding completed status
    const currentProgress = await Progress.findOne({ userId: req.user._id, lessonId: objLessonId });
    if (currentProgress && currentProgress.completed) {
      res.status(200).json({ success: true, data: currentProgress });
      return;
    }

    // VERIFY ACCESS STATUS
    const lessons = await Lesson.find({ courseId: objCourseId, legacy: { $ne: true } }).sort('order').lean();
    const enrollment = await Enrollment.findOne({ studentId: req.user._id, courseId: objCourseId });
    const completedLessons = enrollment ? enrollment.progress.completedLessons.map((l: any) => l.toString()) : [];
    
    const allProgress = await Progress.find({ userId: req.user._id, courseId: objCourseId }).lean();
    const progressMap: Record<string, any> = {};
    allProgress.forEach((p: any) => {
      progressMap[p.lessonId.toString()] = { completedAt: p.completedAt };
    });

    const accessStatuses = getVideoAccessStatuses(lessons, completedLessons, progressMap);
    const lessonStatus = accessStatuses[lessonId];

    if (lessonStatus?.status === 'LOCKED') {
      res.status(403).json({
        success: false,
        message: lessonStatus.reason === 'DAILY_UNLOCK' 
          ? 'This lesson is locked until 7:30 PM.' 
          : 'Complete the previous video to unlock this lesson.'
      });
      return;
    }

    const isCompleted = watchedPercentage >= 95;

    const progress = await Progress.findOneAndUpdate(
      { userId: req.user._id, lessonId: objLessonId },
      {
        courseId: objCourseId,
        lastPlaybackPosition: currentTime,
        watchedPercentage,
        lastWatched: new Date(),
        ...(isCompleted && { completed: true, completedAt: new Date() })
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: progress });
  } catch (error: any) {
    logger.error('Error updating progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getProgress = async (req: any, res: Response): Promise<void> => {
  const { lessonId } = req.params;

  try {
    const progress = await Progress.findOne({ userId: req.user._id, lessonId });
    if (!progress) {
      res.status(200).json({ success: true, data: { currentTime: 0, completionPercentage: 0 } });
      return;
    }

    res.status(200).json({ success: true, data: progress });
  } catch (error: any) {
    logger.error('Error fetching progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
