import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  BookOpen,
  FolderPlus,
  Video,
  ListOrdered,
  Loader2,
  X,
  RefreshCw,
  Users
} from 'lucide-react';

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

  // Module & Lesson states
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);

  // Course Form states
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseFormId, setCourseFormId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCategory, setCourseCategory] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseThumbnail, setCourseThumbnail] = useState('');
  const [courseDuration, setCourseDuration] = useState(0);
  const [coursePrice, setCoursePrice] = useState(0);

  // Module Form states
  const [showModForm, setShowModForm] = useState(false);
  const [modTitle, setModTitle] = useState('');
  const [modOrder, setModOrder] = useState(1);

  const [showLesForm, setShowLesForm] = useState(false);
  const [lesTitle, setLesTitle] = useState('');
  const [lesDesc, setLesDesc] = useState('');
  const [lesNotes, setLesNotes] = useState('');
  const [lesOrder, setLesOrder] = useState(1);
  const [selectedModId, setSelectedModId] = useState('');
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

  // Course Actions
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        title: courseTitle,
        category: courseCategory,
        description: courseDesc,
        thumbnailUrl: courseThumbnail,
        duration: courseDuration,
        price: coursePrice,
      };

      if (courseFormId) {
        await api.put(`/courses/${courseFormId}`, body);
        alert('Course updated successfully!');
      } else {
        await api.post('/courses', body);
        alert('Course created successfully!');
      }

      setCourseTitle('');
      setCourseCategory('');
      setCourseDesc('');
      setCourseThumbnail('');
      setCourseDuration(0);
      setCoursePrice(0);
      setCourseFormId(null);
      setShowCourseForm(false);
      fetchCourses();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit course form');
    }
  };

  const handleDuplicateCourse = async (courseId: string) => {
    try {
      await api.post(`/courses/${courseId}/duplicate`);
      alert('Course duplicated successfully!');
      fetchCourses();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to duplicate course');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('Delete this course? This will remove all associated modules, lessons, and videos permanently from the database. (Video CDN assets will remain intact). Proceed?')) return;
    try {
      await api.delete(`/courses/${courseId}`);
      alert('Course deleted successfully!');
      if (selectedCourse?._id === courseId) {
        setSelectedCourse(null);
      }
      fetchCourses();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete course');
    }
  };

  // Module Actions
  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    try {
      await api.post('/modules', {
        courseId: selectedCourse._id,
        title: modTitle,
        order: modOrder,
      });
      alert('Module added successfully!');
      setModTitle('');
      setShowModForm(false);
      handleSelectCourse(selectedCourse);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteModule = async (modId: string) => {
    if (!window.confirm('Deleting this module will remove all underlying lessons. Proceed?')) return;
    try {
      await api.delete(`/modules/${modId}`);
      alert('Module deleted successfully!');
      if (selectedCourse) handleSelectCourse(selectedCourse);
    } catch (error) {
      console.error(error);
    }
  };

  // Lesson Actions
  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !selectedModId) return;
    try {
      let lessonPayload: any = {
        courseId: selectedCourse._id,
        moduleId: selectedModId,
        title: lesTitle,
        description: lesDesc,
        notesUrl: lesNotes,
        order: lesOrder,
      };

      await api.post('/lessons', lessonPayload);
      alert('Lesson added successfully!');
      setLesTitle('');
      setLesDesc('');
      setLesNotes('');
      setLesOrder(1);
      setShowLesForm(false);
      handleSelectCourse(selectedCourse);
      fetchCourses();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.error || 'Failed to add lesson');
    }
  };

  const handleSyncBunny = async () => {
    try {
      setIsSyncing(true);
      const res = await api.post('/lessons/sync-bunny');
      alert(`Sync Complete!\nCourses: ${res.data.coursesSynced}\nAdded: ${res.data.lessonsAdded}\nUpdated: ${res.data.lessonsUpdated}\nRemoved: ${res.data.lessonsRemoved}`);
      fetchCourses();
      if (selectedCourse) handleSelectCourse(selectedCourse);
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.error || 'Failed to sync with Bunny Stream');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteLesson = async (lesId: string) => {
    if (!window.confirm('Delete this lesson?')) return;
    try {
      await api.delete(`/lessons/${lesId}`);
      alert('Lesson deleted successfully!');
      if (selectedCourse) handleSelectCourse(selectedCourse);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading && courses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-poppins text-slate-800 dark:text-slate-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dynamic Course Management</h2>
          <p className="text-xs text-slate-500">Edit course models, duplicate layout skeletons, or upload lecture notes.</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <button 
            onClick={handleSyncBunny}
            disabled={isSyncing}
            className="btn-accent py-2.5 px-4 text-xs flex items-center gap-1.5 shadow-lg shadow-accent/20"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isSyncing ? 'Syncing...' : 'Refresh Bunny Library'}
          </button>
          <button
            onClick={() => {
              setCourseFormId(null);
              setCourseTitle('');
              setCourseCategory('');
              setCourseDesc('');
              setCourseThumbnail('');
              setShowCourseForm(true);
            }}
            className="bg-slate-800 hover:bg-slate-700 text-white py-2.5 px-4 rounded-lg text-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Course
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: course catalog list */}
        <div className="lg:col-span-1 space-y-6">
          <h3 className="font-bold text-base">Course Catalogs</h3>
          
          <div className="space-y-4">
            {courses.map((c) => {
              const isSelected = selectedCourse?._id === c._id;
              return (
                <div
                  key={c._id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition ${
                    isSelected ? 'border-accent bg-accent/5' : 'border-slate-100 hover:bg-slate-50 dark:border-border-dark dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-accent font-bold uppercase tracking-wider">{c.category}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.status === 'published' ? 'bg-green-500/10 text-green-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                        {c.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-white line-clamp-1">{c.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{c.description}</p>
                    
                    <div className="flex gap-3 pt-2 text-[10px] font-semibold text-slate-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {c.studentCount || 0} Students
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" /> {c.lessonCount || 0} Lessons
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-100/50 pt-3">
                    <button
                      onClick={() => handleSelectCourse(c)}
                      className="text-[11px] font-bold text-primary dark:text-primary-light hover:underline flex items-center gap-1"
                    >
                      <ListOrdered className="w-3.5 h-3.5" /> View Lessons
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCourseFormId(c._id);
                          setCourseTitle(c.title);
                          setCourseCategory(c.category);
                          setCourseDesc(c.description);
                          setCourseThumbnail(c.thumbnailUrl || '');
                          setCourseDuration(c.duration || 0);
                          setCoursePrice(c.price || 0);
                          setShowCourseForm(true);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-800 dark:border-border-dark dark:hover:text-white"
                        title="Edit course metadata"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicateCourse(c._id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-accent dark:border-border-dark"
                        title="Duplicate entire course skeleton"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(c._id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 dark:border-border-dark transition"
                        title="Delete Course permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: module-lesson curriculum detail organizer */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCourse ? (
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-border-dark pb-4">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">Curriculum: {selectedCourse.title}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Add modular sections, links, and lecture details below.</p>
                </div>
                
                <div className="flex gap-2">

                  <button
                    onClick={() => setShowModForm(true)}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 dark:border-border-dark dark:text-slate-300 text-xs font-semibold flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-850"
                  >
                    <FolderPlus className="w-4 h-4 text-accent" /> Add Module
                  </button>
                  <button
                    onClick={() => setShowLesForm(true)}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 dark:border-border-dark dark:text-slate-300 text-xs font-semibold flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-850"
                  >
                    <Video className="w-4 h-4 text-accent" /> Add Lesson
                  </button>
                </div>
              </div>

              {/* Modules List detail */}
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
                          <button
                            onClick={() => handleDeleteModule(mod._id)}
                            className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                            title="Delete Module"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
                                      <img src={les.thumbnailUrl} alt={les.title} className="w-16 h-10 object-cover rounded shadow-sm bg-black" />
                                    ) : (
                                      <div className="w-16 h-10 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center">
                                        <Video className="w-4 h-4 text-slate-400" />
                                      </div>
                                    )}
                                    <div className="space-y-1">
                                      <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        {les.order}. {les.title}
                                        {les.playbackUrl && <span className="text-[9px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Stream Ready</span>}
                                      </p>
                                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                                        {les.duration && <span>{Math.floor(les.duration / 60)}:{(Math.floor(les.duration % 60)).toString().padStart(2, '0')} min</span>}
                                        {les.bunnyVideoId && <span className="font-mono text-slate-400">ID: {les.bunnyVideoId}</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => handleDeleteLesson(les._id)}
                                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                      title="Delete Lesson"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
              <p className="text-xs text-slate-500 max-w-xs mx-auto">Choose a course from the left menu panel to manage modules, video uploads, notes, and lessons checklists.</p>
            </div>
          )}
        </div>
      </div>

      {/* Course Edit/Create Form Modal */}
      {showCourseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 font-poppins">
          <div className="w-full max-w-md glass-card p-6 border border-white/5 space-y-5 text-left relative dark:bg-card-dark">
            <button onClick={() => setShowCourseForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
              {courseFormId ? 'Modify Course Metadata' : 'Create New Course Catalog'}
            </h3>

            <form onSubmit={handleCourseSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-400">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="Advanced React Integration"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Category</label>
                <input
                  type="text"
                  required
                  placeholder="Software Engineering"
                  value={courseCategory}
                  onChange={(e) => setCourseCategory(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Description</label>
                <textarea
                  required
                  placeholder="Curriculum summary details..."
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  className="glass-input py-2 text-xs h-20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Thumbnail URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={courseThumbnail}
                  onChange={(e) => setCourseThumbnail(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400">Duration (Hrs)</label>
                  <input
                    type="number"
                    value={courseDuration}
                    onChange={(e) => setCourseDuration(Number(e.target.value))}
                    className="glass-input py-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Price ($)</label>
                  <input
                    type="number"
                    value={coursePrice}
                    onChange={(e) => setCoursePrice(Number(e.target.value))}
                    className="glass-input py-2 text-xs"
                  />
                </div>
              </div>

              <button type="submit" className="btn-accent w-full py-2.5 text-xs">
                Save Course Details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Module Create Modal */}
      {showModForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 font-poppins">
          <div className="w-full max-w-sm glass-card p-6 border border-white/5 space-y-4 text-left relative dark:bg-card-dark">
            <button onClick={() => setShowModForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Add Section Module</h3>

            <form onSubmit={handleAddModule} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-400">Module Title</label>
                <input
                  type="text"
                  required
                  placeholder="Introduction to State Management"
                  value={modTitle}
                  onChange={(e) => setModTitle(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Sequence Order (number)</label>
                <input
                  type="number"
                  required
                  value={modOrder}
                  onChange={(e) => setModOrder(parseInt(e.target.value))}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <button type="submit" className="btn-accent w-full py-2.5 text-xs">
                Create Module
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Create Modal */}
      {showLesForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 font-poppins">
          <div className="w-full max-w-md glass-card p-6 border border-white/5 space-y-4 text-left relative dark:bg-card-dark">
            <button onClick={() => setShowLesForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Add Lesson Lecture</h3>

            <form onSubmit={handleAddLesson} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-400">Select Parent Module</label>
                <select
                  required
                  value={selectedModId}
                  onChange={(e) => setSelectedModId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent"
                >
                  <option value="">Choose module...</option>
                  {modules.map((m) => (
                    <option key={m._id} value={m._id}>
                      Module {m.order}: {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Lesson Title</label>
                <input
                  type="text"
                  required
                  placeholder="Redux Store setup & Actions"
                  value={lesTitle}
                  onChange={(e) => setLesTitle(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Sequence Order</label>
                  <input
                    type="number"
                    value={lesOrder}
                    onChange={(e) => setLesOrder(parseInt(e.target.value))}
                    className="glass-input py-2 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Notes PDF link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://gdrive.com/..."
                  value={lesNotes}
                  onChange={(e) => setLesNotes(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className="btn-accent w-full py-2.5 text-xs"
              >
                Create Lesson
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourses;
