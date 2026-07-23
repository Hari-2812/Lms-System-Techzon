import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { X, Book, Clock, Trophy, FileText, CheckCircle2, Lock, PlayCircle, Loader2 } from 'lucide-react';

interface StudentAnalyticsDrawerProps {
  studentId: string;
  onClose: () => void;
}

const StudentAnalyticsDrawer: React.FC<StudentAnalyticsDrawerProps> = ({ studentId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [studentId]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get(`/analytics/students/${studentId}`);
      setData(res.data.data);
    } catch (e: any) {
      alert('Failed to load student analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, courseId: string) => {
    if (!window.confirm(`Are you sure you want to perform this action?`)) return;
    setActionLoading(`${action}-${courseId}`);
    try {
      await api.post(`/analytics/students/${studentId}/course/${courseId}/${action}`);
      await fetchAnalytics();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center backdrop-blur-sm">
      <Loader2 className="w-10 h-10 animate-spin text-accent" />
    </div>
  );

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex justify-end backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-4xl h-full bg-white dark:bg-[#0A0F1C] overflow-y-auto font-poppins flex flex-col shadow-2xl">
        
        {/* Header Profile */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0A0F1C]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 p-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-2xl font-bold uppercase">
              {data.profile.name.substring(0, 2)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{data.profile.name}</h2>
              <p className="text-sm text-slate-500">{data.profile.email} • {data.profile.phone || 'No phone'}</p>
              <div className="flex gap-4 mt-2 text-xs font-semibold text-slate-400">
                <span>Batch: {data.courses?.[0]?.batch || 'General'}</span>
                <span>Reg: {new Date(data.profile.createdAt).toLocaleDateString()}</span>
                <span>Active: {data.profile.lastLogin ? new Date(data.profile.lastLogin).toLocaleDateString() : 'Never'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-8 flex-1">
          {/* Courses */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2"><Book className="w-5 h-5 text-accent"/> Course Enrollments ({data.courses.length})</h3>
            {data.courses.map((course: any) => (
              <div key={course.courseId} className="border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden bg-slate-50 dark:bg-card-dark">
                
                {/* Course Header Summary */}
                <div 
                  className="p-5 flex flex-wrap md:flex-nowrap items-center gap-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition"
                  onClick={() => setExpandedCourse(expandedCourse === course.courseId ? null : course.courseId)}
                >
                  <img src={course.thumbnailUrl || '/course-placeholder.jpg'} alt="" className="w-32 h-20 object-cover rounded-lg" />
                  <div className="flex-1 min-w-[200px]">
                    <h4 className="font-bold text-base text-slate-800 dark:text-white">{course.courseName}</h4>
                    <p className="text-xs text-slate-500 mt-1">Enrolled: {new Date(course.enrollmentDate).toLocaleDateString()}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500"/> {course.completedLessonsCount} / {course.totalLessons}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-blue-500"/> {course.timeSpent} mins</span>
                      <span className="flex items-center gap-1"><Trophy className="w-4 h-4 text-yellow-500"/> {course.certificateStatus}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-2xl font-bold text-accent">{course.progress}%</span>
                    <span className="text-xs uppercase font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-md mt-1">{course.status}</span>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedCourse === course.courseId && (
                  <div className="p-6 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0F1C]/50 space-y-6">
                    
                    {/* Admin Actions */}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleAction('reset', course.courseId)} className="bg-slate-800 text-white hover:bg-slate-700 rounded-lg text-xs font-semibold py-1.5 px-3 flex items-center justify-center min-w-[100px]">
                        {actionLoading === `reset-${course.courseId}` ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Reset Progress'}
                      </button>
                      <button onClick={() => handleAction('unlock-all', course.courseId)} className="bg-slate-800 text-white hover:bg-slate-700 rounded-lg text-xs font-semibold py-1.5 px-3 flex items-center justify-center min-w-[100px]">
                        {actionLoading === `unlock-all-${course.courseId}` ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Unlock All Lessons'}
                      </button>
                      <button onClick={() => handleAction('complete', course.courseId)} className="bg-accent text-white hover:bg-accent-hover rounded-lg text-xs font-semibold py-1.5 px-3 flex items-center justify-center min-w-[100px]">
                        {actionLoading === `complete-${course.courseId}` ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Mark Complete'}
                      </button>
                      <button onClick={() => handleAction('certificate', course.courseId)} className="bg-slate-800 text-white hover:bg-slate-700 rounded-lg text-xs font-semibold py-1.5 px-3 flex items-center justify-center min-w-[100px]">
                        {actionLoading === `certificate-${course.courseId}` ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Regenerate Certificate'}
                      </button>
                    </div>

                    {/* Lesson Timeline */}
                    <div>
                      <h5 className="font-bold text-sm mb-4">Lesson Timeline</h5>
                      <div className="space-y-3">
                        {course.timeline.map((les: any, i: number) => (
                          <div key={les.lessonId} className="flex flex-wrap items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-card-dark text-xs gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px]">{i + 1}</div>
                              <span className="font-semibold">{les.title}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              {les.status === 'Completed' && <span className="text-green-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Completed {les.completedAt ? `(${new Date(les.completedAt).toLocaleDateString()})` : ''}</span>}
                              {les.status === 'Watching' && <span className="text-blue-500 font-bold flex items-center gap-1"><PlayCircle className="w-3 h-3"/> Watching {Math.round(les.watchPercentage)}%</span>}
                              {les.status === 'Unlocked' && <span className="text-slate-400 font-bold">Unlocked</span>}
                              {les.status === 'Locked' && <span className="text-slate-400 font-bold flex items-center gap-1"><Lock className="w-3 h-3"/> Locked</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            ))}
            {data.courses.length === 0 && <p className="text-xs text-slate-500">No courses enrolled.</p>}
          </div>

          {/* Quizzes & Assignments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-accent"/> Quizzes</h3>
              <div className="space-y-3">
                {data.quizzes.map((q: any) => (
                  <div key={q._id} className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-card-dark text-xs flex justify-between items-center">
                    <span className="font-bold">{q.quizId?.title || 'Unknown Quiz'}</span>
                    <span className="font-bold text-accent bg-accent/10 px-2 py-1 rounded-md">{q.score} / {q.totalQuestions}</span>
                  </div>
                ))}
                {data.quizzes.length === 0 && <p className="text-xs text-slate-500">No quiz attempts.</p>}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-accent"/> Assignments</h3>
              <div className="space-y-3">
                {data.assignments.map((a: any) => (
                  <div key={a._id} className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-card-dark text-xs flex justify-between items-center">
                    <span className="font-bold">{a.assignmentId?.title || 'Unknown'}</span>
                    <span className={`font-bold px-2 py-1 rounded-md ${a.status === 'graded' ? 'text-green-500 bg-green-500/10' : 'text-yellow-500 bg-yellow-500/10'}`}>{a.status.toUpperCase()}</span>
                  </div>
                ))}
                {data.assignments.length === 0 && <p className="text-xs text-slate-500">No assignments submitted.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAnalyticsDrawer;
