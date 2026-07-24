import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Book, Clock, Trophy, FileText, CheckCircle2, Lock, PlayCircle, Loader2, ArrowLeft, MoreVertical, GraduationCap, BarChart } from 'lucide-react';

const AdminStudentDetails: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [studentId]);

  const fetchAnalytics = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!data) return (
    <div className="text-center py-12 text-slate-500 font-poppins">
      Failed to load student data.
    </div>
  );

  const profile = data.profile;
  const courses = data.courses || [];
  const quizzes = data.quizzes || [];
  const assignments = data.assignments || [];

  // Calculate aggregates
  const totalEnrolled = courses.length;
  const completedCourses = courses.filter((c: any) => c.status === 'Completed').length;
  const inProgressCourses = courses.filter((c: any) => c.status !== 'Completed').length;
  const overallProgress = courses.length > 0 ? Math.round(courses.reduce((acc: number, c: any) => acc + c.progress, 0) / courses.length) : 0;
  const totalLearningTime = courses.reduce((acc: number, c: any) => acc + c.timeSpent, 0);
  const certificatesEarned = courses.filter((c: any) => c.certificateStatus === 'Generated').length;

  return (
    <div className="space-y-8 font-poppins text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/students')} 
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-500"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              Student Details
              <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold ${profile.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {profile.status}
              </span>
            </h2>
            <p className="text-xs text-slate-500">{profile.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile & Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="glass-card p-6 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-bl-full -z-10 group-hover:bg-accent/20 transition-all"></div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-white text-4xl font-bold uppercase shadow-lg shadow-accent/30 mb-4">
                {profile.name.substring(0, 2)}
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">{profile.name}</h3>
              <p className="text-sm text-slate-500 mb-6">{profile.email}</p>
              
              <div className="w-full space-y-3 text-left">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-white/5 text-xs">
                  <span className="text-slate-500">Phone</span>
                  <span className="font-semibold">{profile.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-white/5 text-xs">
                  <span className="text-slate-500">Batch</span>
                  <span className="font-semibold text-accent">{courses?.[0]?.batch || 'General'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-white/5 text-xs">
                  <span className="text-slate-500">Reg. Date</span>
                  <span className="font-semibold">{new Date(profile.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-white/5 text-xs">
                  <span className="text-slate-500">Last Login</span>
                  <span className="font-semibold">{profile.lastLogin ? new Date(profile.lastLogin).toLocaleDateString() : 'Never'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Learning Overview */}
          <div className="glass-card p-6 border border-white/5">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><BarChart className="w-4 h-4 text-accent"/> Learning Overview</h4>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-100 dark:border-white/5 text-center">
                <div className="text-2xl font-extrabold text-accent mb-1">{totalEnrolled}</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Enrolled</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-100 dark:border-white/5 text-center">
                <div className="text-2xl font-extrabold text-green-500 mb-1">{completedCourses}</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Completed</div>
              </div>
            </div>

            <div className="space-y-4">
               <div>
                 <div className="flex justify-between text-xs font-bold mb-1">
                   <span>Overall Progress</span>
                   <span className="text-accent">{overallProgress}%</span>
                 </div>
                 <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-accent rounded-full transition-all duration-500" style={{width: `${overallProgress}%`}}></div>
                 </div>
               </div>

               <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-100 dark:border-white/5">
                 <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><Clock className="w-4 h-4"/></div>
                 <div>
                   <div className="text-xs font-bold">{Math.round(totalLearningTime / 60)} hrs {totalLearningTime % 60} mins</div>
                   <div className="text-[10px] text-slate-500 uppercase">Total Learning Time</div>
                 </div>
               </div>

               <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-100 dark:border-white/5">
                 <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500"><Trophy className="w-4 h-4"/></div>
                 <div>
                   <div className="text-xs font-bold">{certificatesEarned} Certificates</div>
                   <div className="text-[10px] text-slate-500 uppercase">Earned</div>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Enrolled Courses & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2"><Book className="w-5 h-5 text-accent"/> Enrolled Courses</h3>
          
          <div className="space-y-4">
            {courses.map((course: any) => (
              <div key={course.courseId} className="glass-card overflow-hidden border border-white/5 hover:border-accent/30 transition-all group">
                {/* Course Header Summary */}
                <div 
                  className="p-5 flex flex-col md:flex-row md:items-center gap-5 cursor-pointer bg-white/40 dark:bg-card-dark/40"
                  onClick={() => setExpandedCourse(expandedCourse === course.courseId ? null : course.courseId)}
                >
                  <img src={course.thumbnailUrl || '/course-placeholder.jpg'} alt="" className="w-full md:w-36 h-24 object-cover rounded-xl shadow-sm" />
                  
                  <div className="flex-1">
                    <h4 className="font-extrabold text-base text-slate-800 dark:text-white group-hover:text-accent transition">{course.courseName}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Enrolled on {new Date(course.enrollmentDate).toLocaleDateString()}</p>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500"/> {course.completedLessonsCount} / {course.totalLessons}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5 text-blue-500"/> {course.timeSpent} mins
                      </span>
                      {course.certificateStatus === 'Generated' && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-md">
                          <Trophy className="w-3.5 h-3.5"/> Certified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end justify-center">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                       <svg className="w-16 h-16 transform -rotate-90">
                         <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                         <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - course.progress / 100)} className="text-accent transition-all duration-1000" />
                       </svg>
                       <span className="absolute text-sm font-bold text-slate-800 dark:text-white">{course.progress}%</span>
                    </div>
                    <span className={`text-[10px] uppercase font-bold mt-2 px-2 py-0.5 rounded ${course.status === 'Completed' ? 'text-green-500 bg-green-500/10' : 'text-blue-500 bg-blue-500/10'}`}>
                      {course.status}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedCourse === course.courseId && (
                  <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#070b14]/50 space-y-8 animate-in slide-in-from-top-2">
                    
                    {/* Admin Actions */}
                    <div>
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Admin Controls</h5>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleAction('reset', course.courseId)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold py-2 px-4 flex items-center justify-center transition">
                          {actionLoading === `reset-${course.courseId}` ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Reset Progress'}
                        </button>
                        <button onClick={() => handleAction('unlock-all', course.courseId)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold py-2 px-4 flex items-center justify-center transition">
                          {actionLoading === `unlock-all-${course.courseId}` ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Unlock All Lessons'}
                        </button>
                        <button onClick={() => handleAction('complete', course.courseId)} className="btn-accent text-xs py-2 px-4 flex items-center justify-center">
                          {actionLoading === `complete-${course.courseId}` ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Mark Complete'}
                        </button>
                        <button onClick={() => handleAction('certificate', course.courseId)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold py-2 px-4 flex items-center justify-center transition">
                          {actionLoading === `certificate-${course.courseId}` ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Regenerate Cert'}
                        </button>
                      </div>
                    </div>

                    {/* Lesson Timeline */}
                    <div>
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Lesson Timeline</h5>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {course.timeline.map((les: any, i: number) => (
                          <div key={les.lessonId} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 text-xs gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-bold text-[10px] text-slate-500">{i + 1}</div>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{les.title}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              {les.status === 'Completed' && <span className="text-green-500 font-bold flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded"><CheckCircle2 className="w-3.5 h-3.5"/> Completed {les.completedAt ? `(${new Date(les.completedAt).toLocaleDateString()})` : ''}</span>}
                              {les.status === 'Watching' && <span className="text-blue-500 font-bold flex items-center gap-1.5 bg-blue-500/10 px-2 py-1 rounded"><PlayCircle className="w-3.5 h-3.5"/> Watching {Math.round(les.watchPercentage)}%</span>}
                              {les.status === 'Unlocked' && <span className="text-slate-500 font-bold bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">Unlocked</span>}
                              {les.status === 'Locked' && <span className="text-slate-400 font-semibold flex items-center gap-1.5"><Lock className="w-3.5 h-3.5"/> Locked</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            ))}
            {courses.length === 0 && (
              <div className="text-center py-8 bg-slate-50 dark:bg-card-dark rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                <Book className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">No courses enrolled yet.</p>
              </div>
            )}
          </div>

          {/* Quizzes & Assignments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="glass-card p-5 border border-white/5">
              <h3 className="text-base font-bold flex items-center gap-2 mb-4"><FileText className="w-4 h-4 text-accent"/> Quiz Attempts</h3>
              <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                {quizzes.map((q: any) => (
                  <div key={q._id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 text-xs flex justify-between items-center">
                    <span className="font-bold text-slate-700 dark:text-slate-200 truncate pr-4">{q.quizId?.title || 'Unknown Quiz'}</span>
                    <span className="font-bold text-accent bg-accent/10 px-2 py-1 rounded-md shrink-0">{q.score} / {q.totalQuestions}</span>
                  </div>
                ))}
                {quizzes.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No quiz attempts recorded.</p>}
              </div>
            </div>
            
            <div className="glass-card p-5 border border-white/5">
              <h3 className="text-base font-bold flex items-center gap-2 mb-4"><GraduationCap className="w-4 h-4 text-accent"/> Assignments</h3>
              <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                {assignments.map((a: any) => (
                  <div key={a._id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 text-xs flex justify-between items-center">
                    <span className="font-bold text-slate-700 dark:text-slate-200 truncate pr-4">{a.assignmentId?.title || 'Unknown Assignment'}</span>
                    <span className={`font-bold px-2 py-1 rounded-md shrink-0 ${a.status === 'graded' ? 'text-green-500 bg-green-500/10' : 'text-yellow-500 bg-yellow-500/10'}`}>
                      {a.status.toUpperCase()}
                    </span>
                  </div>
                ))}
                {assignments.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No assignments submitted.</p>}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminStudentDetails;
