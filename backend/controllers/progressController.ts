import { Request, Response } from 'express';
import Progress from '../models/Progress';
import Enrollment from '../models/Enrollment';
import Lesson from '../models/Lesson';
import logger from '../config/logger';

export const updateProgress = async (req: any, res: Response): Promise<void> => {
  const { courseId, lessonId, videoId, currentTime, duration, watchedPercentage } = req.body;
  
  if (!courseId || !lessonId) {
    res.status(400).json({ success: false, message: 'Course ID and Lesson ID are required' });
    return;
  }

  try {
    // Fetch current progress first to avoid overriding completed status
    const currentProgress = await Progress.findOne({ userId: req.user._id, lessonId });
    if (currentProgress && currentProgress.isCompleted) {
      res.status(200).json({ success: true, data: currentProgress });
      return;
    }

    const progress = await Progress.findOneAndUpdate(
      { userId: req.user._id, lessonId },
      {
        courseId,
        videoId,
        currentTime,
        completionPercentage: watchedPercentage,
        lastWatched: new Date()
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
