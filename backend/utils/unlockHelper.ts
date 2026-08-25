export interface VideoAccessStatus {
  status: 'COMPLETED' | 'AVAILABLE' | 'LOCKED';
  reason?: 'PREVIOUS_VIDEO_NOT_COMPLETED' | 'DAILY_UNLOCK';
  unlockAt?: string;
}

export function getNext730PM_IST(fromDate: Date): Date {
  const unlockAt = new Date(fromDate.getTime());
  unlockAt.setUTCHours(14, 0, 0, 0); // 14:00 UTC = 19:30 IST

  if (unlockAt.getTime() <= fromDate.getTime()) {
    unlockAt.setUTCDate(unlockAt.getUTCDate() + 1);
  }

  return unlockAt;
}

export function getVideoAccessStatuses(
  lessons: any[],
  completedLessons: string[],
  progressMap: Record<string, { completedAt?: Date | string | null }>
): Record<string, VideoAccessStatus> {
  const result: Record<string, VideoAccessStatus> = {};
  const currentTime = new Date();

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const lessonId = lesson._id.toString();
    const isCompleted = completedLessons.includes(lessonId);

    if (isCompleted) {
      result[lessonId] = { status: 'COMPLETED' };
      continue;
    }

    if (i === 0) {
      result[lessonId] = { status: 'AVAILABLE' };
      continue;
    }

    const prevLesson = lessons[i - 1];
    const prevLessonId = prevLesson._id.toString();
    const isPrevCompleted = completedLessons.includes(prevLessonId);

    if (!isPrevCompleted) {
      result[lessonId] = {
        status: 'LOCKED',
        reason: 'PREVIOUS_VIDEO_NOT_COMPLETED'
      };
      continue;
    }

    let prevCompletedAt = progressMap[prevLessonId]?.completedAt;
    let prevCompletedDate: Date;
    
    if (prevCompletedAt) {
      prevCompletedDate = new Date(prevCompletedAt);
    } else {
      // Fallback
      prevCompletedDate = new Date();
    }

    const unlockAtDate = getNext730PM_IST(prevCompletedDate);

    if (currentTime.getTime() < unlockAtDate.getTime()) {
      result[lessonId] = {
        status: 'LOCKED',
        reason: 'DAILY_UNLOCK',
        unlockAt: unlockAtDate.toISOString()
      };
    } else {
      result[lessonId] = { status: 'AVAILABLE' };
    }
  }

  return result;
}
