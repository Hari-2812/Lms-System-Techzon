import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  BookOpen,
  Video,
  Loader2,
  RefreshCw
} from 'lucide-react';

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

  // Module & Lesson states
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      setCourses(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCourse = async (course: any) => {
    setSelectedCourse(course);
    setLoading(true);
    try {
      const res = await api.get(`/courses/${course._id}`);
      setModules(res.data.data.modules || []);
      setLessons(res.data.data.lessons || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncBunny = async () => {
    setIsSyncing(true);
    console.log("Starting Bunny Sync");
    try {
      console.log("Request URL: /courses/sync-bunny");
      const response = await api.post('/courses/sync-bunny');
      console.log("Response:", response);
      alert('Bunny Stream Library Sync Complete! The curriculum has been rebuilt.');
      await fetchCourses();
      if (selectedCourse) {
        await handleSelectCourse(selectedCourse);
      }
    } catch (error: any) {
      console.error("Axios Error:", error);
      console.error("Status:", error.response?.status);
      console.error("Response Data:", error.response?.data);
      console.error("Headers:", error.response?.headers);
      console.error("Request:", error.request);
      alert(error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to sync Bunny Stream');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-poppins">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">Manage Curriculum</h2>
          <p className="text-xs text-slate-500 font-medium">Bunny Stream is the Single Source of Truth for all video lessons.</p>
        </div>
        <button
          onClick={handleSyncBunny}
          disabled={isSyncing}
          className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-lg disabled:opacity-50"
        >
          {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isSyncing ? 'Syncing...' : 'Sync Bunny Library'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Course List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-4 space-y-3">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-sm mb-4">Course Catalogs</h3>
            {loading && !courses.length ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {courses.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No courses available. Please Sync Bunny.</p>
                ) : (
                  courses.map((course) => (
                    <div
                      key={course._id}
                      onClick={() => handleSelectCourse(course)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                        selectedCourse?._id === course._id 
                          ? 'border-accent bg-accent/5 dark:bg-accent/10 shadow-sm' 
                          : 'border-slate-100 hover:border-slate-300 dark:border-border-dark dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-white truncate max-w-[200px]">{course.title}</h4>
                        <span className="text-[10px] text-slate-500 font-medium">{course.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Module & Lesson Tree */}
        <div className="lg:col-span-2">
          {selectedCourse ? (
            <div className="glass-card p-5 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-border-dark pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">{selectedCourse.title} Curriculum</h3>
                  <p className="text-[10px] text-slate-500">Read-only view synced directly from Bunny Stream.</p>
                </div>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {modules.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-12">No curriculum modules developed yet.</p>
                ) : (
                  modules.map((mod) => {
                    const modLessons = lessons.filter((l) => {
                      const lModId = typeof l.moduleId === 'object' && l.moduleId !== null ? (l.moduleId as any)._id : l.moduleId;
                      return lModId === mod._id;
                    });
                    return (
                      <div key={mod._id} className="p-4 border border-slate-100 dark:border-border-dark/60 rounded-xl space-y-3">
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-card-dark/30 p-2.5 rounded-lg">
                          <h4 className="font-extrabold text-xs text-slate-800 dark:text-white">
                            Module {mod.order}: {mod.title}
                          </h4>
                        </div>

                        {/* Lessons List details */}
                        <div className="space-y-2">
                          {modLessons.length === 0 ? (
                            <p className="text-[10px] text-slate-400 pl-4">No lessons added to this module yet.</p>
                          ) : (
                            modLessons.map((les) => (
                              <div key={les._id} className="flex flex-col gap-2 p-3 border-b border-slate-50/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition rounded-lg">
                                <div className="flex justify-between items-start">
                                  <div className="flex gap-3">
                                    {les.thumbnailUrl ? (
                                      <>
                                        <img src={les.thumbnailUrl} alt={les.title} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} className="w-16 h-10 object-cover rounded shadow-sm bg-black" />
                                        <div className="hidden w-16 h-10 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center">
                                          <Video className="w-4 h-4 text-slate-400" />
                                        </div>
                                      </>
                                    ) : (
                                      <div className="w-16 h-10 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center">
                                        <Video className="w-4 h-4 text-slate-400" />
                                      </div>
                                    )}
                                    <div className="space-y-1">
                                      <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        {les.order}. {les.title}
                                        {les.videoStatus === 3 ? (
                                          <span className="text-[9px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Stream Ready</span>
                                        ) : (
                                          <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Processing</span>
                                        )}
                                      </p>
                                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                                        {les.duration && <span>{Math.floor(les.duration / 60)}:{(Math.floor(les.duration % 60)).toString().padStart(2, '0')} min</span>}
                                        {les.bunnyVideoId && <span className="font-mono text-slate-400">ID: {les.bunnyVideoId}</span>}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 animate-float" />
              <h4 className="text-slate-600 dark:text-slate-400 font-bold font-poppins">Select a Course Catalog</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">Choose a course from the left menu panel to view its synced curriculum.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCourses;
