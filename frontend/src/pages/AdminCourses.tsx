import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  BookOpen,
  Video,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  X,
  AlertTriangle
} from 'lucide-react';

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

  // Module & Lesson states
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Published'>('All');

  // Deletion Modal states
  const [courseToDelete, setCourseToDelete] = useState<any | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
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
    setModules([]);
    setLessons([]);
    try {
      const res = await api.get(`/courses/${course._id}`);
      setModules(res.data.data.modules || []);
      setLessons(res.data.data.lessons || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSyncBunny = async () => {
    setIsSyncing(true);
    try {
      await api.post('/courses/sync-bunny');
      alert('Bunny Stream Library Sync Complete! The curriculum has been rebuilt.');
      await fetchCourses();
      if (selectedCourse) {
        await handleSelectCourse(selectedCourse);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || 'Failed to sync Bunny Stream');
    } finally {
      setIsSyncing(false);
    }
  };

  const confirmDeleteCourse = (course: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setCourseToDelete(course);
    setDeleteConfirmationText('');
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/courses/${courseToDelete._id}`);
      alert('Course permanently deleted.');
      setCourseToDelete(null);
      if (selectedCourse?._id === courseToDelete._id) {
        setSelectedCourse(null);
        setModules([]);
        setLessons([]);
      }
      await fetchCourses();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to delete course.';
      alert(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and search courses
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'All' || course.status === statusFilter || (statusFilter === 'Published' && course.status?.toLowerCase() === 'published') || (statusFilter === 'Draft' && course.status?.toLowerCase() === 'draft');
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in font-poppins relative">
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Course List (Enhanced Grid) */}
        <div className="xl:col-span-5 space-y-4">
          <div className="glass-card p-5 space-y-4 shadow-sm border border-slate-200 dark:border-border-dark">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Course Catalogs</h3>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2 py-1 rounded-md">
                {filteredCourses.length} Total
              </span>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-border-dark rounded-lg text-xs focus:ring-2 focus:ring-accent outline-none text-slate-800 dark:text-white transition-all"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full sm:w-auto pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-border-dark rounded-lg text-xs focus:ring-2 focus:ring-accent outline-none text-slate-800 dark:text-white appearance-none cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            {loading && !courses.length ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <p className="text-xs text-slate-500 animate-pulse">Loading catalogs...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 max-h-[65vh] overflow-y-auto pr-1 stylish-scrollbar">
                {filteredCourses.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-center bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <BookOpen className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No courses found</p>
                    <p className="text-[10px] text-slate-400 mt-1">Try adjusting your search or sync with Bunny Stream.</p>
                  </div>
                ) : (
                  filteredCourses.map((course) => {
                    const isSelected = selectedCourse?._id === course._id;
                    const isDraft = course.status?.toLowerCase() === 'draft';
                    
                    return (
                      <div
                        key={course._id}
                        onClick={() => handleSelectCourse(course)}
                        className={`group relative p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col gap-3 overflow-hidden
                          ${isSelected 
                            ? 'border-accent bg-accent/5 dark:bg-accent/10 shadow-md ring-1 ring-accent/20' 
                            : 'border-slate-200 bg-white hover:bg-slate-50 dark:bg-card-dark dark:border-border-dark dark:hover:border-slate-600 shadow-sm hover:shadow-md'
                          }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                        )}
                        
                        <div className="flex justify-between items-start gap-2">
                          <h4 className={`font-bold text-sm leading-tight line-clamp-2 ${isSelected ? 'text-accent dark:text-accent-light' : 'text-slate-800 dark:text-white'}`}>
                            {course.title}
                          </h4>
                          <button
                            onClick={(e) => confirmDeleteCourse(course, e)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                            title="Delete Course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/60">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide uppercase ${
                            isDraft 
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' 
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {course.status || 'Draft'}
                          </span>
                          
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {course._id.substring(course._id.length - 6)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Module & Lesson Tree */}
        <div className="xl:col-span-7">
          {selectedCourse ? (
            <div className="glass-card p-6 space-y-6 shadow-sm border border-slate-200 dark:border-border-dark">
              <div className="flex justify-between items-end border-b border-slate-100 dark:border-border-dark pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-xl mb-1">{selectedCourse.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded font-bold uppercase">Curriculum View</span>
                    <p className="text-[10px] text-slate-500">Read-only view synced directly from Bunny Stream.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2 stylish-scrollbar">
                {modules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Video className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No modules developed yet</p>
                    <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">This course catalog is currently empty. Sync from Bunny Stream to populate the curriculum.</p>
                  </div>
                ) : (
                  modules.map((mod) => {
                    const modLessons = lessons.filter((l) => {
                      const lModId = typeof l.moduleId === 'object' && l.moduleId !== null ? (l.moduleId as any)._id : l.moduleId;
                      return lModId === mod._id;
                    });
                    return (
                      <div key={mod._id} className="p-5 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl shadow-sm space-y-4">
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                          <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
                            <span className="text-accent mr-2">Module {mod.order}:</span> {mod.title}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-700 px-2 py-1 rounded shadow-sm">
                            {modLessons.length} Lessons
                          </span>
                        </div>

                        {/* Lessons List details */}
                        <div className="space-y-3 pl-2">
                          {modLessons.length === 0 ? (
                            <p className="text-xs text-slate-400 pl-2 italic">No lessons in this module.</p>
                          ) : (
                            modLessons.map((les) => (
                              <div key={les._id} className="group flex gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                {les.thumbnailUrl ? (
                                  <div className="relative flex-shrink-0 w-24 h-14 rounded-md overflow-hidden shadow-sm bg-black group-hover:shadow-md transition">
                                    <img src={les.thumbnailUrl} alt={les.title} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} className="w-full h-full object-cover opacity-90 group-hover:opacity-100" />
                                    <div className="hidden absolute inset-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                      <Video className="w-5 h-5 text-slate-400" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex-shrink-0 w-24 h-14 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                    <Video className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                                  </div>
                                )}
                                
                                <div className="flex flex-col justify-center space-y-1.5 flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                      {les.order}. {les.title}
                                    </p>
                                    {les.videoStatus === 3 ? (
                                      <span className="flex-shrink-0 text-[9px] bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Ready</span>
                                    ) : (
                                      <span className="flex-shrink-0 text-[9px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">Processing</span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-[10px] text-slate-500 font-medium">
                                    {les.duration > 0 ? (
                                      <span className="flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                        {Math.floor(les.duration / 60)}:{(Math.floor(les.duration % 60)).toString().padStart(2, '0')} min
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">Duration pending</span>
                                    )}
                                    {les.bunnyVideoId && (
                                      <span className="font-mono text-slate-400 flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                        {les.bunnyVideoId}
                                      </span>
                                    )}
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
            <div className="glass-card h-[65vh] flex flex-col items-center justify-center text-center p-8 space-y-4 border border-slate-200 dark:border-border-dark shadow-sm">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-2 shadow-inner">
                <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 animate-float" />
              </div>
              <h4 className="text-slate-700 dark:text-slate-300 font-extrabold text-lg">Select a Course Catalog</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">Choose a course from the directory panel to view its detailed curriculum, modules, and synchronized video lessons.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-border-dark overflow-hidden transform scale-100 transition-transform">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-500">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-extrabold text-lg">Delete Course Permanently?</h3>
              </div>
              <button 
                onClick={() => setCourseToDelete(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                You are about to permanently delete the course <strong className="text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{courseToDelete.title}</strong> and all its associated curriculum data. 
                <span className="block mt-2 font-bold text-red-600 dark:text-red-400">This action cannot be undone.</span>
              </p>
              
              <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 p-4 rounded-xl">
                <p className="text-xs text-orange-800 dark:text-orange-300 font-medium leading-relaxed">
                  <strong>Data Integrity Check:</strong> The system will verify if this course has active student enrollments, payments, or progress. If dependencies exist, the deletion will be securely blocked by the backend to prevent data corruption.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Please type <span className="text-slate-900 dark:text-white select-all font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1 rounded">{courseToDelete.title}</span> to confirm.
                </label>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none text-slate-800 dark:text-white transition-all font-medium"
                  placeholder="Type course name..."
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setCourseToDelete(null)}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCourse}
                disabled={deleteConfirmationText !== courseToDelete.title || isDeleting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-red-500/20"
              >
                {isDeleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete Permanently</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourses;
