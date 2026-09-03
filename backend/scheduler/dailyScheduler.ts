import cron from 'node-cron';
import User from '../models/User';
import Enrollment from '../models/Enrollment';
import mongoose from 'mongoose';
import Course from '../models/Course';
import Module from '../models/Module';
import Lesson from '../models/Lesson';
import DailyReminderLog from '../models/DailyReminderLog';
import { sendDailyReminderEmail } from '../services/email';
import { getRegisteredStudentsForDirectory } from '../services/studentService';
import { getVideoAccessStatuses } from '../utils/unlockHelper';
import logger from '../config/logger';

export const runDailyReminderJob = async (dryRun = false) => {
  logger.info('[DAILY REMINDER] Starting 7:00 PM IST reminder job');
  const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  let eligibleCount = 0;
  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  try {
    const students = await getRegisteredStudentsForDirectory();

    for (const student of students) {
      let maskedEmail = student.email || '';
      const atIndex = maskedEmail.indexOf('@');
      if (atIndex > 2) {
        maskedEmail = maskedEmail.substring(0, 2) + '*'.repeat(atIndex - 2) + maskedEmail.substring(atIndex);
      }

      if (!student.email) {
        logger.info(`[DAILY REMINDER] Student Directory recipient: name="${student.name}" email=null source="student-directory" included=false reason="missing/invalid email"`);
        continue;
      }
      
      const eligibleForReminder = true;
      logger.info(`[DAILY REMINDER] Student Directory recipient: name="${student.name}" email="${maskedEmail}" source="student-directory" included=true`);

      if (eligibleForReminder) {
        eligibleCount++;
        
        if (!dryRun) {
          try {
            const reminderModel = DailyReminderLog as any;
            const exists = await reminderModel.findOne({ studentId: student._id, date: todayDateStr, type: 'EMAIL_REMINDER' });
            if (exists) {
              skippedCount++;
              continue;
            }

            await reminderModel.create({
              studentId: student._id,
              date: todayDateStr,
              type: 'EMAIL_REMINDER'
            });

            try {
              await sendDailyReminderEmail(student.email, student.name);
              logger.info(`[DAILY REMINDER] Email sent successfully: ${maskedEmail}`);
              sentCount++;
            } catch (emailErr: any) {
              await reminderModel.deleteOne({ studentId: student._id, date: todayDateStr, type: 'EMAIL_REMINDER' });
              logger.info(`[DAILY REMINDER] Email failed: ${maskedEmail} - ${emailErr.message}`);
              throw emailErr;
            }
          } catch (err: any) {
            // E11000 duplicate key error means another process beat us to it.
            if (err.code === 11000) {
              skippedCount++;
            } else {
              failedCount++;
              logger.error(`[DAILY REMINDER] Failed for student ${student.email}:`, err);
            }
          }
        }
      }
    }

    logger.info(`[DAILY REMINDER] Completed. Sent: ${sentCount} Failed: ${failedCount} Skipped: ${skippedCount}`);

    return { 
      eligibleStudents: eligibleCount, 
      sent: sentCount, 
      skipped: skippedCount, 
      failed: failedCount 
    };
  } catch (err) {
    logger.error('[DAILY REMINDER] Fatal error during reminder job:', err);
    throw err;
  }
};

export const runDailyUnlockStatsJob = async (dryRun = false) => {
  logger.info('[VIDEO UNLOCK] Starting 7:30 PM IST unlock job');
  const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  
  let eligibleEnrollmentsCount = 0;
  let unlockedCount = 0;

  try {
    const students = await User.find({ role: 'Student', status: 'active' }).lean();

    for (const student of students) {
      const enrollments = await Enrollment.find({ studentId: student._id, status: 'active' }).lean();
      
      const progressModel = mongoose.model('Progress');

      for (const enrollment of enrollments) {
        const course = (await Course.findById(enrollment.courseId).lean()) as any;
        if (!course) continue;

        let allLessons: any[] = [];
        const modules = await Module.find({ courseId: course._id }).sort('order').lean() as any[];
        for (const mod of modules) {
          const lessons = await Lesson.find({ moduleId: mod._id }).sort('order').lean();
          allLessons = allLessons.concat(lessons);
        }

        const progress = (await progressModel.findOne({ userId: student._id, courseId: course._id }).lean()) as any;
        const completedLessons: string[] = progress?.completedLessons || [];
        const progressMap = progress?.progressMap || {};

        // Since it runs at 7:30 PM (or later), the status will compute as AVAILABLE for ones that unlock today.
        // We have to figure out if it unlocked TODAY by checking the getNext730PM_IST relative to previous completion.
        
        let hasUnlockedToday = false;
        
        for (let i = 1; i < allLessons.length; i++) {
          const lesson = allLessons[i];
          const lessonId = lesson._id.toString();
          if (completedLessons.includes(lessonId)) continue;
          
          const prevLesson = allLessons[i - 1];
          const prevLessonId = prevLesson._id.toString();
          if (completedLessons.includes(prevLessonId)) {
            const prevCompletedAt = progressMap[prevLessonId]?.completedAt || new Date();
            const unlockAtDate = new Date(prevCompletedAt);
            unlockAtDate.setUTCHours(14, 0, 0, 0);
            if (unlockAtDate.getTime() <= new Date(prevCompletedAt).getTime()) {
              unlockAtDate.setUTCDate(unlockAtDate.getUTCDate() + 1);
            }
            if (unlockAtDate.toISOString().split('T')[0] === todayDateStr) {
              if (new Date().getTime() >= unlockAtDate.getTime()) {
                hasUnlockedToday = true;
                unlockedCount++;
              }
            }
          }
        }
        
        if (hasUnlockedToday) {
          eligibleEnrollmentsCount++;
        }
      }
    }

    logger.info(`[VIDEO UNLOCK] Eligible enrollments: ${eligibleEnrollmentsCount}`);
    logger.info(`[VIDEO UNLOCK] Videos unlocked: ${unlockedCount}`);
    logger.info(`[VIDEO UNLOCK] Completed successfully`);
    
    return { eligibleEnrollmentsCount, unlockedCount };
  } catch (err) {
    logger.error('[VIDEO UNLOCK] Fatal error during unlock job:', err);
    throw err;
  }
};

export const initializeScheduler = () => {
  logger.info('[Scheduler] Daily reminder scheduler initialized');
  logger.info('[Scheduler] Video unlock scheduler initialized');
  logger.info('[Scheduler] Timezone: Asia/Kolkata');

  cron.schedule('0 19 * * *', () => {
    runDailyReminderJob().catch(console.error);
  }, {
    timezone: 'Asia/Kolkata'
  });

  cron.schedule('30 19 * * *', () => {
    runDailyUnlockStatsJob().catch(console.error);
  }, {
    timezone: 'Asia/Kolkata'
  });
};
