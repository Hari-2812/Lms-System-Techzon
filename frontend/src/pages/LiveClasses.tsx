import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Calendar, Video, Loader2, ExternalLink } from 'lucide-react';
import { getClassStatus, formatTimeIST, formatDateIST } from '../utils/classStatus';
import type { ClassStatus } from '../utils/classStatus';
import { PageHeader, EmptyState, Card, Button, Badge, LoadingState } from '../components/ui';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';

interface LiveClassItem {
  _id: string;
  title: string;
  description?: string;
  meetingLink: string;
  meetingPlatform: string;
  scheduledTime: string;
  durationMinutes: number;
  status: string;
  dynamicStatus?: ClassStatus;
  courseId?: {
    title: string;
  };
  mentorId?: {
    name: string;
    email: string;
  };
}

const LiveClasses: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [classes, setClasses] = useState<LiveClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveClasses();
  }, []);

  const fetchLiveClasses = async () => {
    try {
      const res = await api.get('/live-classes');
      let data = res.data.data || [];
      
      data = data.map((c: any) => ({
        ...c,
        dynamicStatus: getClassStatus(c.scheduledTime, c.durationMinutes, c.status)
      }));
      setClasses(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classes.length === 0) return;
    const interval = setInterval(() => {
      setClasses(prevClasses => {
        let changed = false;
        const newClasses = prevClasses.map(c => {
          const newStatus = getClassStatus(c.scheduledTime, c.durationMinutes, c.status);
          if (newStatus !== c.dynamicStatus) changed = true;
          return { ...c, dynamicStatus: newStatus };
        });
        return changed ? newClasses : prevClasses;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [classes]);

  const handleJoinClass = (id: string, meetingLink: string) => {
    if (!meetingLink || meetingLink.trim() === '') {
      alert('Meeting link is not available for this class.');
      return;
    }

    const isValidUrl = meetingLink.startsWith('http://') || meetingLink.startsWith('https://');
    if (!isValidUrl) {
      alert('Meeting link is unavailable or invalid.');
      return;
    }

    // Open synchronously to avoid browser popup blockers and about:blank issues
    try {
      const parsedUrl = new URL(meetingLink.trim());
      window.open(parsedUrl.toString(), '_blank', 'noopener,noreferrer');
      
      // Record attendance asynchronously in the background
      api.post(`/live-classes/${id}/join`).catch(err => console.error("Attendance recording failed:", err));
      
      // Optionally re-fetch classes to update status or attendance
      // fetchLiveClasses();
    } catch {
      alert('Invalid meeting link.');
    }
  };

  if (loading) {
    return <LoadingState message="Loading live classes..." />;
  }

  const upcomingClasses = classes.filter(c => c.dynamicStatus === 'UPCOMING' || c.dynamicStatus === 'LIVE NOW');

  return (
    <div className="space-y-8 font-poppins pb-20">
      <PageHeader
        title="Upcoming Live Classes"
        subtitle="Live sessions for your enrolled courses."
      />

      <div className="space-y-6">
        {upcomingClasses.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-12 h-12" />}
            title="No upcoming live classes."
            description="Check back later for your next session."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {upcomingClasses.map((cls) => (
              <Card key={cls._id} className={`border-l-4 ${cls.dynamicStatus === 'LIVE NOW' ? 'border-l-accent' : 'border-l-blue-500'} flex flex-col justify-between h-full`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={cls.dynamicStatus === 'LIVE NOW' ? 'accent' : 'secondary'} className={cls.dynamicStatus === 'LIVE NOW' ? 'animate-pulse' : ''}>
                      {cls.dynamicStatus}
                    </Badge>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full uppercase">
                      {cls.meetingPlatform}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-1">{cls.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cls.courseId?.title}</p>
                  </div>

                  <div className="space-y-2 text-xs text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <span>Date:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{formatDateIST(cls.scheduledTime)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Time:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">
                        {formatTimeIST(cls.scheduledTime)} 
                        {' - '} 
                        {formatTimeIST(new Date(new Date(cls.scheduledTime).getTime() + cls.durationMinutes * 60000).toISOString())}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span>Mentor:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{cls.mentorId?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-auto">
                  {cls.dynamicStatus === 'LIVE NOW' ? (
                    <Button
                      variant="accent"
                      onClick={() => handleJoinClass(cls._id, cls.meetingLink)}
                      className="w-full flex items-center justify-center gap-2 group"
                    >
                      <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" /> Join Class Now
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled
                      className="w-full flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <Video className="w-4 h-4" /> Link Available when Class Starts
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveClasses;
