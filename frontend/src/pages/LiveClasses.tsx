import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Calendar, Video, Loader2, ExternalLink } from 'lucide-react';
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
      setClasses(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (id: string, meetingLink: string) => {
    if (!meetingLink || meetingLink.trim() === '') {
      alert('Meeting link is not available for this class.');
      return;
    }

    const isValidUrl = meetingLink.startsWith('http://') || meetingLink.startsWith('https://');
    if (!isValidUrl) {
      alert('Meeting link is unavailable or invalid.');
      return;
    }

    // Open synchronously to avoid browser popup blockers
    const newWindow = window.open('', '_blank', 'noopener,noreferrer');

    try {
      await api.post(`/live-classes/${id}/join`);
      if (newWindow) {
        newWindow.location.href = meetingLink;
      } else {
        // Fallback if popup was still blocked
        window.location.href = meetingLink;
      }
      fetchLiveClasses();
    } catch (error: any) {
      console.error(error);
      if (newWindow) {
        newWindow.close();
      }
      alert(error.response?.data?.message || 'Error joining class');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const upcomingClasses = classes.filter(c => c.status === 'scheduled');

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
              <div key={cls._id} className="glass-card p-6 border-l-4 border-l-accent flex flex-col justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-accent/10 text-accent font-bold px-2 py-0.5 rounded-full uppercase">
                      {cls.meetingPlatform}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {new Date(cls.scheduledTime).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white line-clamp-1">{cls.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium truncate">{cls.courseId?.title}</p>
                  
                  {cls.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{cls.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 font-semibold pt-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-border-dark">
                    <span>
                      Time: {new Date(cls.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(new Date(cls.scheduledTime).getTime() + cls.durationMinutes * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <span>•</span>
                    <span>Mentor: {cls.mentorId?.name || 'Assigned Mentor'}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleJoinClass(cls._id, cls.meetingLink)}
                  disabled={!cls.meetingLink}
                  className={`w-full py-3 text-sm flex items-center justify-center gap-2 ${
                    !cls.meetingLink 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 rounded-xl' 
                      : 'btn-primary'
                  }`}
                >
                  {!cls.meetingLink ? (
                    'Meeting Link Unavailable'
                  ) : (
                    <>Join Class <ExternalLink className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveClasses;
