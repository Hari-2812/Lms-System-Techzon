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
  PlusCircle,
  RefreshCw,
  Users
} from 'lucide-react';

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [syncStats, setSyncStats] = useState<any | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

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
  const [courseCloudinaryFolder, setCourseCloudinaryFolder] = useState('');
  const [courseDuration, setCourseDuration] = useState(0);
  const [coursePrice, setCoursePrice] = useState(0);

  // Module Form states
  const [showModForm, setShowModForm] = useState(false);
  const [modTitle, setModTitle] = useState('');
  const [modOrder, setModOrder] = useState(1);

  // Lesson Form states
  const [showLesForm, setShowLesForm] = useState(false);
  const [lesTitle, setLesTitle] = useState('');
  const [lesDesc, setLesDesc] = useState('');
  const [lesVideo, setLesVideo] = useState('');
  const [lesVideoFile, setLesVideoFile] = useState<File | null>(null);
  const [videoUploadLoading, setVideoUploadLoading] = useState(false);
  const [lesDuration, setLesDuration] = useState(300);
  const [lesNotes, setLesNotes] = useState('');
  const [lesOrder, setLesOrder] = useState(1);
  const [selectedModId, setSelectedModId] = useState('');

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

  const handleSyncCloudinary = async () => {
    if (!window.confirm('Sync with Cloudinary? This will fetch all videos and automatically sync them to their respective courses based on folder names.')) return;
    setIsSyncing(true);
    try {
      const res = await api.post('/courses/sync-cloudinary');
      const stats = res.data.stats;
      if (stats) {
        setSyncStats(stats);
        setShowSyncModal(true);
      } else {
        alert(res.data.message || 'Synced successfully!');
      }
      fetchCourses();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to sync with Cloudinary');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRepairCurriculum = async () => {
    if (!window.confirm('Run Curriculum Repair? This will reconstruct missing modules and lessons for orphaned videos across all courses.')) return;
    setIsSyncing(true);
    try {
      const res = await api.post('/courses/repair-curriculum');
      alert(res.data.message || 'Curriculum repaired successfully!');
      fetchCourses();
      if (selectedCourse) {
        handleSelectCourse(selectedCourse);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to repair curriculum');
    } finally {
      setIsSyncing(false);
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
        cloudinaryFolder: courseCloudinaryFolder,
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
      setShowCourseForm(false);
      setCourseFormId(null);
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
    if (!window.confirm('Delete this course? This will remove all associated modules, lessons, and videos permanently from the database. (Cloudinary assets will remain intact). Proceed?')) return;
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
        videoDuration: lesDuration,
        notesUrl: lesNotes,
        order: lesOrder,
      };

      if (lesVideoFile) {
        setVideoUploadLoading(true);
        const formData = new FormData();
        formData.append('video', lesVideoFile);
        const uploadRes = await api.post('/lessons/upload-video', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const videoData = uploadRes.data.data;
        lessonPayload.video = {
          url: videoData.url,
          publicId: videoData.publicId,
          duration: videoData.duration,
        };
        lessonPayload.videoUrl = videoData.url;
      } else if (lesVideo) {
        lessonPayload.videoUrl = lesVideo;
      }

      await api.post('/lessons', lessonPayload);
      alert('Lesson added successfully!');
      setLesTitle('');
      setLesDesc('');
      setLesVideo('');
      setLesVideoFile(null);
      setLesNotes('');
      setLesDuration(300);
      setLesOrder(1);
      setShowLesForm(false);
      handleSelectCourse(selectedCourse);
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.error || 'Failed to add lesson');
    } finally {
      setVideoUploadLoading(false);
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
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg max-w-xl">
            <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300">Cloudinary Sync Guide:</h4>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
              Upload videos to any folder in Cloudinary. The system will automatically detect the folder (e.g. <span className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded">AWS</span>, <span className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded mx-1">Cloud Computing</span>) and dynamically create or sync the corresponding course without manual entry.
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 items-center">
          {isSyncing && (
            <div className="flex items-center gap-2 mr-4">
              <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-accent animate-pulse" style={{ width: '100%' }}></div>
              </div>
              <span className="text-xs text-slate-500 font-bold">Syncing...</span>
            </div>
          )}
          <button
            onClick={handleSyncCloudinary}
            disabled={isSyncing}
            className="btn-primary py-2.5 px-5 text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> Sync Cloudinary
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
            className="btn-accent py-2.5 px-5 text-xs flex items-center gap-1.5"
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
                          setCourseCloudinaryFolder(c.cloudinaryFolder || '');
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
                    onClick={handleRepairCurriculum}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 dark:border-border-dark dark:text-slate-300 text-xs font-semibold flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-850"
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`w-4 h-4 text-amber-500 ${isSyncing ? 'animate-spin' : ''}`} /> Repair Curriculum
                  </button>
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
                    const modLessons = lessons.filter((l) => l.moduleId === mod._id);
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
                              <div key={les._id} className="flex justify-between items-center text-xs font-medium pl-4 py-2 border-b border-slate-50/50">
                                <span className="flex items-center gap-2">
                                  <Video className="w-4 h-4 text-slate-400" />
                                  {les.order}. {les.title}
                                </span>
                                <button
                                  onClick={() => handleDeleteLesson(les._id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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

              <div className="space-y-1">
                <label className="text-slate-400">Cloudinary Folder</label>
                <input
                  type="text"
                  placeholder="AWS Cloud Computing"
                  value={courseCloudinaryFolder}
                  onChange={(e) => setCourseCloudinaryFolder(e.target.value)}
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

              <div className="space-y-1">
                <label className="text-slate-400">Upload Video File</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setLesVideoFile(e.target.files?.[0] || null)}
                  className="glass-input py-2 text-xs"
                />
                {lesVideoFile && (
                  <p className="text-[10px] text-slate-500">Selected file: {lesVideoFile.name}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Video URL (Cloudinary link)</label>
                <input
                  type="url"
                  placeholder="https://res.cloudinary.com/..."
                  value={lesVideo}
                  onChange={(e) => setLesVideo(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
                <p className="text-[10px] text-slate-500">Upload a file or paste an existing Cloudinary video URL.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Video Duration (seconds)</label>
                  <input
                    type="number"
                    value={lesDuration}
                    onChange={(e) => setLesDuration(parseInt(e.target.value))}
                    className="glass-input py-2 text-xs"
                  />
                </div>
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
                disabled={videoUploadLoading}
              >
                {videoUploadLoading ? 'Uploading video…' : 'Create Lesson'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sync Results Modal */}
      {showSyncModal && syncStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 font-poppins">
          <div className="w-full max-w-2xl glass-card p-6 border border-white/5 space-y-5 text-left relative dark:bg-card-dark max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowSyncModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-border-dark pb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-lg">Cloudinary Sync Completed</h3>
                <p className="text-[11px] text-slate-500 font-medium">Last Sync: {new Date(syncStats.lastSync).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-border-dark">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Courses Found</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{syncStats.foldersFound}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-border-dark">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Courses Created</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{syncStats.coursesCreated || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-border-dark">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Videos Found</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{syncStats.fetched}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-border-dark">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Videos Imported</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{syncStats.imported}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-border-dark">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Modules Created</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{syncStats.modulesCreated || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-border-dark">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Lessons Created</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{syncStats.lessonsCreated || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-border-dark">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Videos Linked</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{syncStats.videosLinked || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-border-dark">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Videos Updated</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{syncStats.updated}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-border-dark">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Broken Lessons</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{syncStats.brokenLessons || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-border-dark">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Videos Deleted</p>
                <p className="text-xl font-extrabold text-red-500">{syncStats.deleted}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">Synced Courses Breakdown</h4>
              <div className="border border-slate-200 dark:border-border-dark rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-border-dark">
                    <tr>
                      <th className="py-3 px-4 font-bold">Course</th>
                      <th className="py-3 px-4 font-bold w-32 text-right">Videos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-border-dark">
                    {syncStats.courseStats && syncStats.courseStats.length > 0 ? (
                      syncStats.courseStats.map((cs: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{cs.courseName}</td>
                          <td className="py-3 px-4 text-right">
                            <span className="bg-accent/10 text-accent font-bold px-2.5 py-1 rounded-lg">
                              {cs.count}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-slate-500">No courses synced.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-border-dark mt-6 flex justify-end">
              <button onClick={() => setShowSyncModal(false)} className="btn-primary py-2 px-6 text-xs">
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourses;
