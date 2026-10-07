import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { PageHeader, Card, Button, LoadingState } from '../components/ui';
import { Settings, Plus, LayoutList, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminProjectCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, configsRes] = await Promise.all([
        api.get('/courses'),
        api.get('/admin/course-project-config')
      ]);
      setCourses(coursesRes.data.data || []);
      setConfigs(configsRes.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load courses or project configs');
    } finally {
      setLoading(false);
    }
  };

  const getConfigStatus = (courseId: string, type: 'minor' | 'major') => {
    const config = configs.find(c => c.courseId === courseId);
    if (!config) return false;
    if (type === 'minor') return config.minorProject?.isActive && !!config.minorProject?.title;
    return config.majorProject?.isActive && !!config.majorProject?.title;
  };

  if (loading) return <LoadingState message="Loading courses..." />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-poppins pb-20 animate-fade-in">
      <PageHeader
        title="Configure Course Projects"
        subtitle="Manage Minor and Major projects for all domains and courses."
        icon={LayoutList}
        actions={
          <Button variant="secondary" onClick={() => navigate('/admin/projects')}>
            Back to Projects
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">Course / Domain</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">Minor Project</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">Major Project</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {courses.map((course) => {
                const isMinorConfigured = getConfigStatus(course._id, 'minor');
                const isMajorConfigured = getConfigStatus(course._id, 'major');

                return (
                  <tr key={course._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-slate-900 dark:text-white">{course.title}</div>
                      <div className="text-sm text-slate-500 truncate max-w-[250px]">{course.subtitle}</div>
                    </td>
                    <td className="p-4">
                      {isMinorConfigured ? (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Configured
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-medium">
                          <AlertCircle className="w-4 h-4" /> Not Configured
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {isMajorConfigured ? (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Configured
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-medium">
                          <AlertCircle className="w-4 h-4" /> Not Configured
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant={isMinorConfigured && isMajorConfigured ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => navigate(`/admin/projects/config/${course._id}`)}
                        className="flex items-center gap-2 ml-auto"
                      >
                        {isMinorConfigured || isMajorConfigured ? <Settings className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        Configure
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No courses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminProjectCourses;
