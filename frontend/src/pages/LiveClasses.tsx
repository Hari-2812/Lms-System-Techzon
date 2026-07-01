import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Calendar, Video, Loader2, Link2, ExternalLink } from 'lucide-react';
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

  // States for Mentor scheduling
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [platform, setPlatform] = useState('google-meet');
  const [link, setLink] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    fetchLiveClasses();
    if (['admin', 'super-admin', 'mentor'].includes(user?.role || '')) {
      fetchCourses();
    }
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

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      setCourses(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleScheduleClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/live-classes', {
        title,
        description,
        courseId,
        meetingPlatform: platform,
        meetingLink: link,
        scheduledTime: time,
        durationMinutes: duration,
      });
      alert('Class scheduled successfully!');
      fetchLiveClasses();
      setTitle('');
      setDescription('');
      setLink('');
      setTime('');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error scheduling class');
    }
  };

  const handleJoinClass = async (id: string, meetingLink: string) => {
    try {
      await api.post(`/live-classes/${id}/join`);
      window.open(meetingLink, '_blank');
      fetchLiveClasses();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-poppins">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Live Classes & Webinars</h2>
          <p className="text-xs text-slate-500">Scheduled face-to-face mentorship coordinates.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Scheduled classes list */}
        <div className="lg:col-span-2 space-y-6">
          {classes.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 mx-auto text-slate-400" />
              <h4 className="text-lg font-bold text-slate-600 dark:text-slate-300">No scheduled classes found</h4>
              <p className="text-xs text-slate-500">Live coordinates are configured dynamically by mentors.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {classes.map((cls) => (
                <div key={cls._id} className="glass-card p-6 border-l-4 border-l-accent flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2 min-w-0">
                    <span className="text-[10px] bg-accent/10 text-accent font-bold px-2 py-0.5 rounded-full uppercase">
                      {cls.meetingPlatform}
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">{cls.title}</h3>
                    <p className="text-xs text-slate-500 font-medium truncate">{cls.courseId?.title}</p>
                    <div className="flex flex-wrap gap-4 text-[10px] text-slate-400 font-semibold pt-1">
                      <span>Time: {new Date(cls.scheduledTime).toLocaleString()}</span>
                      <span>•</span>
                      <span>Duration: {cls.durationMinutes} Mins</span>
                      <span>•</span>
                      <span>Mentor: {cls.mentorId?.name || 'Assigned Mentor'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoinClass(cls._id, cls.meetingLink)}
                    className="btn-primary py-2.5 px-6 text-xs flex items-center justify-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
                  >
                    Join Lecture <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mentor scheduling sidebar */}
        {['admin', 'super-admin', 'mentor'].includes(user?.role || '') && (
          <div className="glass-card p-6 space-y-5 h-fit">
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Schedule Live Class</h3>

            <form onSubmit={handleScheduleClass} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-500">Class Title</label>
                <input
                  type="text"
                  required
                  placeholder="Introductory Live Doubt Clear"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Description</label>
                <textarea
                  placeholder="Details for this session..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="glass-input py-2 text-xs h-16"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Select Target Course</label>
                <select
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent"
                >
                  <option value="">Choose course...</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent"
                  >
                    <option value="google-meet">Google Meet</option>
                    <option value="zoom">Zoom</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="glass-input py-2 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Meeting Link</label>
                <input
                  type="url"
                  required
                  placeholder="https://meet.google.com/..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Scheduled Date/Time</label>
                <input
                  type="datetime-local"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <button type="submit" className="btn-accent w-full py-2.5 text-xs">
                Schedule Webinar
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveClasses;
