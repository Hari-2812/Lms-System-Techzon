import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { BookOpen, Users, CalendarRange, Clock, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader, Card, EmptyState, LoadingState } from '../components/ui';

interface Course {
  _id: string;
  title: string;
  category: string;
  description: string;
  thumbnailUrl?: string;
}

const MentorCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMentorDashboard();
  }, []);

  const fetchMentorDashboard = async () => {
    try {
      const resStats = await api.get('/analytics/mentor');
      setStats(resStats.data.data);

      const resCourses = await api.get('/courses');
      setCourses(resCourses.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  return (
    <div className="space-y-8 font-poppins text-slate-800 dark:text-slate-200 pb-20">
      <PageHeader
        title="Mentor Command Center"
        subtitle="Manage interactive student lectures, grade course assignments, and review curriculum feedback."
      />

      {/* Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-2xl font-bold">{stats?.totalEnrolledStudents || 0}</h5>
            <p className="text-xs text-slate-500 font-medium">Assigned Enrolled Students</p>
          </div>
        </Card>

        <Card className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <CalendarRange className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-2xl font-bold">{stats?.scheduledLiveClasses || 0}</h5>
            <p className="text-xs text-slate-500 font-medium">Scheduled Live Seminars</p>
          </div>
        </Card>

        <Card className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-2xl font-bold">{stats?.pendingGradingCount || 0}</h5>
            <p className="text-xs text-slate-500 font-medium">Pending Grade Submissions</p>
          </div>
        </Card>
      </div>

      {/* Courses Catalog Assigned List */}
      <div className="space-y-6">
        <h3 className="font-bold text-base">Assigned Courses Skeletons</h3>
        
        {courses.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-8 h-8" />}
            title="No assigned courses"
            description="You have not been assigned to any courses yet."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course._id} className="p-0 overflow-hidden hover:shadow-xl transition flex flex-col justify-between">
                <div>
                  <div className="h-40 w-full overflow-hidden bg-slate-900 border-b border-slate-100 dark:border-border-dark">
                    <img
                      src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'}
                      alt={course.title}
                      onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'; }}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5 space-y-2">
                    <span className="text-[10px] text-accent font-bold uppercase tracking-wider">{course.category}</span>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-white line-clamp-1">{course.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{course.description}</p>
                  </div>
                </div>

                <div className="p-5 border-t border-slate-50 dark:border-border-dark/30">
                  <Link
                    to={`/courses/${course._id}`}
                    className="w-full py-2 rounded-lg bg-primary hover:bg-primary-light text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    Manage Curriculum <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorCourses;
