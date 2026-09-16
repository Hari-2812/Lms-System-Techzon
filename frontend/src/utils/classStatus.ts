export type ClassStatus = 'UPCOMING' | 'LIVE NOW' | 'COMPLETED' | 'CANCELLED';

export const getClassStatus = (
  scheduledTimeStr: string,
  durationMinutes: number,
  backendStatus: string
): ClassStatus => {
  if (backendStatus === 'cancelled' || backendStatus === 'CANCELLED') {
    return 'CANCELLED';
  }
  
  const now = Date.now();
  const startTime = new Date(scheduledTimeStr).getTime();
  const endTime = startTime + durationMinutes * 60 * 1000;

  if (now < startTime) {
    return 'UPCOMING';
  } else if (now >= startTime && now < endTime) {
    return 'LIVE NOW';
  } else {
    return 'COMPLETED';
  }
};

export const formatTimeIST = (dateStr: string) => {
  if (!dateStr) return 'TBA';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'TBA';
  return date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateIST = (dateStr: string) => {
  if (!dateStr) return 'TBA';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'TBA';
  return date.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};
