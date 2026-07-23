import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { BookOpen, Award, CheckCircle, Clock, Video, Loader2, ArrowRight, Calendar, AlertCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';

interface Enrollment {
  _id: string;
  courseId: {
    _id: string;
    title: string;
    description: string;
    category: string;
    thumbnailUrl?: string;
  };
  learningPlanId: {
    name: string;
  };
  startDate: string;
  expiryDate: string;
  progress: {
    percentComplete: number;
  };
}

const StudentDashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get('/analytics/student');
      setStats(res.data.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 font-poppins animate-pulse">
        {/* Banner Skeleton */}
        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl w-full"></div>
        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          ))}
        </div>
        {/* Main Area Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 font-poppins">
        <AlertCircle className="w-12 h-12 text-red-500 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Unable to load dashboard</h3>
        <p className="text-xs text-slate-500 max-w-sm">Please verify the connection to the backend system and try again.</p>
        <button onClick={fetchStats} className="btn-accent py-2 px-6 rounded-lg text-xs font-semibold">
          Retry
        </button>
      </div>
    );
  }

  const enrollments: Enrollment[] = stats?.enrollments || [];
  const liveClasses = stats?.liveClasses || [];

  return (
    <div className="space-y-8 font-poppins">
      {/* Welcome Banner */}
      <div className="glass-card p-8 bg-gradient-to-r from-primary to-secondary text-white relative overflow-hidden dark:border-none">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-accent to-transparent" />
        <div className="relative z-10 space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Welcome back, {user?.name}!</h2>
          <p className="text-slate-300 text-sm max-w-xl font-poppins font-medium">
            Continue where you left off. Watch lectures, submit assignments, and verify your progress tags.
          </p>
        </div>
      </div>

      {/* Analytics Counter Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center dark:bg-primary-light/20 dark:text-primary-light">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-2xl font-bold">{stats?.coursesCount || 0}</h5>
            <p className="text-xs text-slate-500 font-medium">Enrolled Courses</p>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-2xl font-bold">{stats?.completedCoursesCount || 0}</h5>
            <p className="text-xs text-slate-500 font-medium">Completed Courses</p>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-2xl font-bold">{stats?.assignmentSubmissions || 0}</h5>
            <p className="text-xs text-slate-500 font-medium">Assignments Sent</p>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-2xl font-bold">{stats?.passedQuizzes || 0}</h5>
            <p className="text-xs text-slate-500 font-medium">Quizzes Passed</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Courses Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">My Active Courses</h3>
          </div>

          {enrollments.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-3">
              <BookOpen className="w-12 h-12 mx-auto text-slate-400" />
              <h4 className="text-lg font-bold text-slate-600 dark:text-slate-300">No courses assigned yet.</h4>
              <p className="text-xs text-slate-500">Please contact the administrator to assign courses to your account.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {enrollments.map((enrollment) => (
                <div key={enrollment._id} className="glass-card overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition duration-300 flex flex-col justify-between">
                  <div>
                    {/* Thumbnail */}
                    <div className="h-40 w-full overflow-hidden relative bg-slate-900 border-b border-slate-100 dark:border-border-dark">
                      <img
                        src={enrollment.courseId?.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'}
                        alt={enrollment.courseId?.title}
                        className="w-full h-full object-cover opacity-90"
                      />
                      <span className="absolute top-3 left-3 text-[10px] bg-accent/80 text-white font-bold px-2 py-0.5 rounded-full uppercase">
                        {enrollment.learningPlanId?.name}
                      </span>
                    </div>

                    <div className="p-5 space-y-3">
                      <span className="text-[10px] text-accent font-semibold tracking-wider uppercase font-inter">
                        {enrollment.courseId?.category}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1 leading-6">
                        {enrollment.courseId?.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {enrollment.courseId?.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-2 space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Progress</span>
                        <span className="text-accent">{enrollment.progress?.percentComplete || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-border-dark h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-accent h-full rounded-full transition-all duration-300"
                          style={{ width: `${enrollment.progress?.percentComplete || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Dynamic Lessons Info */}
                    {(enrollment as any).totalLessons > 0 && (
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-border-dark">
                        <div className="flex flex-col">
                          <span className="text-slate-400">Completed</span>
                          <span className="text-slate-700 dark:text-slate-300 font-bold">{(enrollment as any).lessonsCompleted} / {(enrollment as any).totalLessons}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-400">Remaining</span>
                          <span className="text-slate-700 dark:text-slate-300 font-bold">{(enrollment as any).remainingLessons}</span>
                        </div>
                        {(enrollment as any).currentLesson && (
                          <div className="col-span-2 mt-1">
                            <span className="text-slate-400">Up Next: </span>
                            <span className="text-accent font-semibold">{(enrollment as any).currentLesson?.title}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expiry detail */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>Expires: {new Date(enrollment.expiryDate).toLocaleDateString()}</span>
                    </div>

                    {/* Call to action */}
                    <Link
                      to={`/courses/${enrollment.courseId?._id}`}
                      className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-light flex items-center justify-center gap-1.5 transition"
                    >
                      Resume Learning <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Info Area */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white font-poppins">Upcoming Lectures</h3>

          {liveClasses.length === 0 ? (
            <div className="glass-card p-6 text-center space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-slate-400" />
              <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">No live classes scheduled</h4>
              <p className="text-[10px] text-slate-500">Live classes require a Mentor-Led or Advanced plan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {liveClasses.map((item: any) => (
                <div key={item._id} className="glass-card p-5 border-l-4 border-l-accent flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-accent/10 text-accent">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate">{item.title}</h4>
                    <p className="text-xs text-slate-500 font-medium truncate">{item.courseId?.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold mt-1">
                      <span>{new Date(item.scheduledTime).toLocaleString()}</span>
                      <span>•</span>
                      <span>{item.durationMinutes} Mins</span>
                    </div>
                    <Link
                      to="/live-classes"
                      className="inline-block text-[11px] font-bold text-accent hover:text-accent-hover transition duration-200 mt-2"
                    >
                      View Link & Attend
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
