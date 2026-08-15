import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Calendar, Video, Loader2, Link2, ExternalLink, Edit, Trash2, Users, X, Check, Eye } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';

interface CourseItem {
  _id: string;
  title: string;
}

interface LiveClassItem {
  _id: string;
  title: string;
  description?: string;
  meetingLink: string;
  meetingPlatform: string;
  scheduledTime: string;
  durationMinutes: number;
  status: string;
  courseId: {
    _id: string;
    title: string;
  };
  mentorId?: {
    name: string;
    email: string;
  };
  registeredStudents?: number;
}

const AdminLiveClasses: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [classes, setClasses] = useState<LiveClassItem[]>([]);
  
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editClassId, setEditClassId] = useState('');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState('google-meet');
  const [link, setLink] = useState('');
  
  // Date and Time inputs
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Stats
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0, cancelled: 0 });

  // Students modal
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [currentClassTitle, setCurrentClassTitle] = useState('');

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
      setLoadingCourses(false);
    }
  };

  const fetchClassesForCourse = async (courseId: string) => {
    setLoadingClasses(true);
    try {
      const res = await api.get(`/live-classes?courseId=${courseId}`);
      const data = res.data.data || [];
      setClasses(data);
      
      // Calculate stats
      const upcoming = data.filter((c: any) => c.status === 'scheduled').length;
      const completed = data.filter((c: any) => c.status === 'completed').length;
      const cancelled = data.filter((c: any) => c.status === 'cancelled').length;
      setStats({ total: data.length, upcoming, completed, cancelled });
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleSelectCourse = (course: CourseItem) => {
    setSelectedCourse(course);
    fetchClassesForCourse(course._id);
    setShowForm(false);
  };

  const calculateDurationAndScheduledTime = (dateStr: string, start: string, end: string) => {
    const startDateTime = new Date(`${dateStr}T${start}`);
    const endDateTime = new Date(`${dateStr}T${end}`);
    const durationMinutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000);
    return { scheduledTime: startDateTime.toISOString(), durationMinutes };
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    
    try {
      const { scheduledTime, durationMinutes } = calculateDurationAndScheduledTime(date, startTime, endTime);
      
      if (durationMinutes <= 0) {
        alert('End time must be after start time.');
        return;
      }

      const payload = {
        title,
        description,
        courseId: selectedCourse._id,
        meetingPlatform: platform,
        meetingLink: link,
        scheduledTime,
        durationMinutes,
      };

      if (editMode) {
        await api.put(`/live-classes/${editClassId}`, payload);
        alert('Live class updated successfully!');
      } else {
        const res = await api.post('/live-classes', payload);
        alert(res.data.message || 'Live class created successfully!');
      }
      
      fetchClassesForCourse(selectedCourse._id);
      resetForm();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error saving class');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLink('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setShowForm(false);
    setEditMode(false);
    setEditClassId('');
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (cls: LiveClassItem) => {
    setTitle(cls.title);
    setDescription(cls.description || '');
    setPlatform(cls.meetingPlatform);
    setLink(cls.meetingLink);
    
    const d = new Date(cls.scheduledTime);
    setDate(d.toISOString().split('T')[0]);
    
    // Format start time HH:mm
    const startHours = d.getHours().toString().padStart(2, '0');
    const startMinutes = d.getMinutes().toString().padStart(2, '0');
    setStartTime(`${startHours}:${startMinutes}`);
    
    // Calculate end time
    const endD = new Date(d.getTime() + cls.durationMinutes * 60000);
    const endHours = endD.getHours().toString().padStart(2, '0');
    const endMinutes = endD.getMinutes().toString().padStart(2, '0');
    setEndTime(`${endHours}:${endMinutes}`);
    
    setEditClassId(cls._id);
    setEditMode(true);
    setShowForm(true);
  };

  const handleCancelClass = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this class? Students will be notified.')) {
      try {
        await api.patch(`/live-classes/${id}/cancel`);
        alert('Class cancelled.');
        if (selectedCourse) fetchClassesForCourse(selectedCourse._id);
      } catch (error: any) {
        alert('Error cancelling class');
      }
    }
  };

  const handleViewStudents = async (cls: LiveClassItem) => {
    setCurrentClassTitle(cls.title);
    setShowStudentsModal(true);
    setLoadingStudents(true);
    try {
      const res = await api.get(`/live-classes/${cls._id}`);
      setStudentsList(res.data.data.students || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingStudents(false);
    }
  };

  if (loadingCourses) {
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
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Live Classes Management</h2>
          <p className="text-xs text-slate-500">Manage live classes and webinars by course.</p>
        </div>
      </div>

      {!selectedCourse ? (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Select a Course / Domain</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {courses.map(course => (
              <div 
                key={course._id} 
                onClick={() => handleSelectCourse(course)}
                className="glass-card p-6 cursor-pointer hover:border-accent transition-all duration-300"
              >
                <h4 className="font-bold text-slate-800 dark:text-white line-clamp-2">{course.title}</h4>
                <p className="text-xs text-slate-500 mt-2">View Live Classes →</p>
              </div>
            ))}
            {courses.length === 0 && (
              <p className="text-sm text-slate-500 col-span-full">No courses found. Please create a course first.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedCourse(null)} className="text-xs font-semibold text-accent hover:underline">
                ← Back to Courses
              </button>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">{selectedCourse.title} - Live Classes</h3>
            </div>
            {!showForm && (
              <button onClick={openCreateForm} className="btn-accent py-2 px-4 text-xs font-bold flex items-center gap-2">
                <Video className="w-4 h-4" />
                Create Live Class
              </button>
            )}
          </div>

          {!showForm ? (
            <>
              {/* Dashboard Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.total}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Upcoming</p>
                  <p className="text-2xl font-bold text-blue-500 mt-1">{stats.upcoming}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Completed</p>
                  <p className="text-2xl font-bold text-green-500 mt-1">{stats.completed}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Cancelled</p>
                  <p className="text-2xl font-bold text-red-500 mt-1">{stats.cancelled}</p>
                </div>
              </div>

              {/* Class List */}
              {loadingClasses ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
              ) : classes.length === 0 ? (
                <div className="glass-card p-12 text-center space-y-3">
                  <Calendar className="w-12 h-12 mx-auto text-slate-400" />
                  <h4 className="text-lg font-bold text-slate-600 dark:text-slate-300">No live classes scheduled for this course.</h4>
                  <button onClick={openCreateForm} className="btn-primary py-2 px-4 text-xs mt-4">
                    Create Live Class
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700 dark:text-slate-200">Class Schedule</h4>
                  {classes.map(cls => (
                    <div key={cls._id} className={`glass-card p-6 border-l-4 ${cls.status === 'cancelled' ? 'border-l-red-500 opacity-70' : cls.status === 'completed' ? 'border-l-green-500' : 'border-l-blue-500'} flex flex-col md:flex-row md:items-center justify-between gap-6`}>
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${cls.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : cls.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            {cls.status === 'scheduled' ? 'UPCOMING' : cls.status.toUpperCase()}
                          </span>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full uppercase">
                            {cls.meetingPlatform}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">{cls.title}</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500 font-medium">
                          <p>Date: <span className="text-slate-700 dark:text-slate-300">{new Date(cls.scheduledTime).toLocaleDateString()}</span></p>
                          <p>Time: <span className="text-slate-700 dark:text-slate-300">
                            {new Date(cls.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                            {' - '} 
                            {new Date(new Date(cls.scheduledTime).getTime() + cls.durationMinutes * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span></p>
                          <p>Mentor: <span className="text-slate-700 dark:text-slate-300">{cls.mentorId?.name || 'Assigned Mentor'}</span></p>
                          <p>Students Registered: <span className="text-slate-700 dark:text-slate-300 font-bold">{cls.registeredStudents || 0}</span></p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button onClick={() => handleViewStudents(cls)} className="btn-secondary py-1.5 px-3 text-[10px] flex items-center justify-center gap-1.5">
                          <Users className="w-3 h-3" /> View Students
                        </button>
                        {cls.status === 'scheduled' && (
                          <>
                            <button onClick={() => openEditForm(cls)} className="btn-secondary py-1.5 px-3 text-[10px] flex items-center justify-center gap-1.5">
                              <Edit className="w-3 h-3" /> Edit
                            </button>
                            <button onClick={() => handleCancelClass(cls._id)} className="bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 py-1.5 px-3 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors">
                              <X className="w-3 h-3" /> Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="glass-card p-6 md:p-8 space-y-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">
                  {editMode ? 'Edit Live Class' : 'Create Live Class'}
                </h3>
                <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveClass} className="space-y-5 text-sm font-semibold">
                <div className="space-y-1">
                  <label className="text-slate-500">Course / Domain</label>
                  <input
                    type="text"
                    disabled
                    value={selectedCourse.title}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-slate-50 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 text-xs">Class Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Generative AI Introduction"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="glass-input py-2.5 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 text-xs">Description</label>
                  <textarea
                    placeholder="Brief description of what will be covered..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="glass-input py-2 text-sm h-20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500 text-xs">Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="glass-input py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 text-xs">Start Time <span className="text-red-500">*</span></label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="glass-input py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 text-xs">End Time <span className="text-red-500">*</span></label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="glass-input py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500 text-xs">Meeting Platform</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="glass-input py-2.5 text-sm"
                    >
                      <option value="google-meet">Google Meet</option>
                      <option value="zoom">Zoom</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-slate-500 text-xs">Meeting Link <span className="text-red-500">*</span></label>
                    <input
                      type="url"
                      required
                      placeholder="https://..."
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      className="glass-input py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={resetForm} className="btn-secondary py-2 px-6">Cancel</button>
                  <button type="submit" className="btn-accent py-2 px-8">
                    {editMode ? 'Save Changes' : 'Create Live Class'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Students Modal */}
      {showStudentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-card-dark rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 dark:border-border-dark flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Registered Students</h3>
                <p className="text-xs text-slate-500 mt-1">{currentClassTitle}</p>
              </div>
              <button onClick={() => setShowStudentsModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-transparent">
              {loadingStudents ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
              ) : studentsList.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-500">No active students registered.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentsList.map((student: any, idx) => (
                    <div key={student._id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-border-dark flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{student.studentId?.name || 'Unknown Student'}</p>
                          <p className="text-xs text-slate-500">{student.studentId?.email}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold px-2 py-1 rounded-md uppercase">
                          {student.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLiveClasses;
