import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Calendar, Video, Loader2, ExternalLink } from 'lucide-react';
import { getClassStatus, formatTimeIST, formatDateIST, ClassStatus } from '../utils/classStatus';
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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const upcomingClasses = classes.filter(c => c.dynamicStatus === 'UPCOMING' || c.dynamicStatus === 'LIVE NOW');

  return (
    <div className="space-y-8 font-poppins">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Upcoming Live Classes</h2>
          <p className="text-xs text-slate-500">Live sessions for your enrolled courses.</p>
        </div>
      </div>

      <div className="space-y-6">
        {upcomingClasses.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-3 max-w-3xl mx-auto">
            <Calendar className="w-12 h-12 mx-auto text-slate-400" />
            <h4 className="text-lg font-bold text-slate-600 dark:text-slate-300">No upcoming live classes.</h4>
            <p className="text-xs text-slate-500">Check back later for your next session.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {upcomingClasses.map((cls) => (
              <div key={cls._id} className={`glass-card p-6 border-l-4 ${cls.dynamicStatus === 'LIVE NOW' ? 'border-l-accent' : 'border-l-blue-500'} flex flex-col justify-between h-full`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${cls.dynamicStatus === 'LIVE NOW' ? 'bg-accent/10 text-accent animate-pulse' : 'bg-blue-500/10 text-blue-500'}`}>
                      {cls.dynamicStatus}
                    </span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full uppercase">
                      {cls.meetingPlatform}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-1">{cls.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cls.courseId?.title}</p>
                  </div>

                  <div className="space-y-2 text-xs text-slate-500 font-medium bg-slate-50 dark:bg-[#0f172a] p-3 rounded-lg border border-slate-100 dark:border-white/5">
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
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-white/5">
                      <span>Mentor:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{cls.mentorId?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-auto">
                  {cls.dynamicStatus === 'LIVE NOW' ? (
                    <button 
                      onClick={() => handleJoinClass(cls._id, cls.meetingLink)}
                      className="w-full btn-accent py-2 text-xs font-bold flex items-center justify-center gap-2 group"
                    >
                      <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" /> Join Class Now
                    </button>
                  ) : (
                    <button 
                      disabled
                      className="w-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 py-2 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Video className="w-4 h-4" /> Link Available when Class Starts
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveClasses;
