import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  Users, Edit, Trash2, Shield, Search, BookOpen, Clock, AlertTriangle, ChevronDown, CheckCircle, Mail, Eye, Upload, UserPlus, FileDown,
  Loader2, RefreshCw, X
} from 'lucide-react';
import { PageHeader, Card, Button, Modal, Input, Badge, EmptyState, LoadingState } from '../components/ui';

interface Student {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  createdAt: string;
  enrolledCourses?: string[];
  enrolledCourseCount?: number;
  overallProgress?: number;
  currentCourse?: string;
  lastActive?: string;
  batch?: string;
  studentProfile?: {
    phone?: string;
    city?: string;
    qualification?: string;
    dateOfBirth?: string;
  };
}

const AdminStudents: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'mentors'>('students');

  // Create Mentor/Admin states
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'mentor' | 'admin'>('mentor');
  const [saving, setSaving] = useState(false);

  // Edit Student states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    qualification: '',
    dateOfBirth: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Student states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Manage Enrollments states
  const [courses, setCourses] = useState<any[]>([]);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [savingEnrollments, setSavingEnrollments] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const resStuds = await api.get('/users/students');
      setStudents(resStuds.data.data || []);

      const resMents = await api.get('/users/mentors');
      setMentors(resMents.data.data || []);
      
      const resCourses = await api.get('/courses');
      setCourses(resCourses.data.data || []);
    } catch (error: any) {
      console.error(error);
      setError(error.response?.data?.message || 'Unable to load students.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.post('/users/create-admin-mentor', {
        name,
        email,
        password,
        role,
      });

      alert(`Account for ${role} created successfully!`);
      setName('');
      setEmail('');
      setPassword('');
      setShowForm(false);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create user account');
    } finally {
      setSaving(false);
    }
  };

  const [resending, setResending] = useState<string | null>(null);

  const handleResendCredentials = async (student: Student) => {
    if (!window.confirm(`Resend Login Credentials?\n\nStudent: ${student.name}\nEmail: ${student.email}\n\nA new temporary password will be generated.\nThe student's current password will be replaced.`)) {
      return;
    }
    
    setResending(student._id);
    try {
      const res = await api.post(`/users/students/${student._id}/resend-credentials`);
      if (res.data.emailSent) {
        alert('Login credentials sent successfully.\n\nA new temporary password has been generated and sent to the student\'s email.');
      } else {
        alert(res.data.message || 'Credentials updated, but email delivery failed. Please use Resend Login Credentials again.');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to resend welcome credentials.');
    } finally {
      setResending(null);
    }
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setEditForm({
      name: student.name,
      email: student.email,
      phone: student.studentProfile?.phone || student.phone || '',
      city: student.studentProfile?.city || '',
      qualification: student.studentProfile?.qualification || '',
      dateOfBirth: student.studentProfile?.dateOfBirth ? new Date(student.studentProfile.dateOfBirth).toISOString().split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    
    setSavingEdit(true);
    try {
      await api.put(`/users/students/${editingStudent._id}`, editForm);
      alert('Student details updated successfully.');
      setShowEditModal(false);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update student details.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
    setDeleteConfirmEmail('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    if (deleteConfirmEmail !== studentToDelete.email) return;

    setDeleting(true);
    try {
      await api.delete(`/users/students/${studentToDelete._id}`);
      alert('Student deleted successfully.\nThe student\'s LMS access has been completely removed.');
      setShowDeleteModal(false);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Unable to delete student.\nNo changes were completed. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenEnrollments = (student: Student) => {
    setSelectedStudent(student);
    setSelectedCourses(student.enrolledCourses || []);
    setShowEnrollmentModal(true);
  };

  const handleSaveEnrollments = async () => {
    if (!selectedStudent) return;
    setSavingEnrollments(true);
    try {
      await api.put(`/users/students/${selectedStudent._id}/enrollments`, {
        courses: selectedCourses
      });
      alert('Student enrollments updated successfully!');
      setShowEnrollmentModal(false);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update enrollments.');
    } finally {
      setSavingEnrollments(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading students..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Unable to load students</h3>
        <p className="text-slate-500">{error}</p>
        <button 
          onClick={fetchUsers}
          className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-poppins text-slate-800 dark:text-slate-200 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="LMS Users Directory"
          subtitle="Manage registered students lists and create secure mentor accounts."
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchUsers}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button
            variant="accent"
            onClick={() => {
              setShowForm(!showForm);
              setRole('mentor');
            }}
            className="flex items-center gap-2 shadow-lg shadow-accent/20"
          >
            {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Create Mentor'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 font-poppins">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'students'
              ? 'border-accent text-accent'
              : 'border-transparent text-slate-500'
          }`}
        >
          Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('mentors')}
          className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'mentors'
              ? 'border-accent text-accent'
              : 'border-transparent text-slate-500'
          }`}
        >
          Mentors ({mentors.length})
        </button>
      </div>

      {/* List grids */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead className="bg-slate-55/50 border-b border-slate-100 dark:border-border-dark text-slate-500 text-[10px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Name & Email</th>
                {activeTab === 'students' ? (
                  <>
                      <th className="px-6 py-4">Batch</th>
                      <th className="px-6 py-4 text-center">Paid</th>
                      <th className="px-6 py-4 text-center">Active Enrolled</th>
                      <th className="px-6 py-4">Course Progress</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4">Registered On</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Verification</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 dark:divide-border-dark/30">
              {(activeTab === 'students' ? students : mentors).map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition">
                  <td className="px-6 py-4">
                    {activeTab === 'students' ? (
                      <button onClick={() => navigate(`/admin/students/${item._id}`)} className="text-left focus:outline-none">
                        <p className="font-bold text-slate-800 dark:text-white hover:text-accent transition">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.email} {item.phone ? `• ${item.phone}` : ''}</p>
                      </button>
                    ) : (
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.email}</p>
                      </div>
                    )}
                  </td>
                  {activeTab === 'students' ? (
                    <>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{item.batch || 'General'}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-white">{item.paidCourseCount || 0}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-white">{item.activeEnrollmentCount || 0}</td>
                      <td className="px-6 py-4">
                        {item.enrolledCourseCount === 0 ? (
                          <span className="text-slate-400 text-[11px] font-semibold">No active courses</span>
                        ) : (
                          <div className="flex flex-col gap-1 w-32">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-slate-600 dark:text-slate-300">
                                {Math.min(Math.max(item.overallProgress || 0, 0), 100)}% 
                                <span className="font-normal text-slate-400 ml-1">
                                  {item.enrolledCourseCount === 1 ? '(1 Course)' : `(${item.enrolledCourseCount} Courses)`}
                                </span>
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-accent transition-all rounded-full" 
                                style={{ width: `${Math.min(Math.max(item.overallProgress || 0, 0), 100)}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                              {(item.overallProgress || 0) === 0 ? 'Not Started' :
                               (item.overallProgress || 0) < 25 ? 'Just Started' :
                               (item.overallProgress || 0) < 50 ? 'In Progress' :
                               (item.overallProgress || 0) < 75 ? 'Good Progress' :
                               (item.overallProgress || 0) < 100 ? 'Almost Complete' : 'Completed'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <button 
                          onClick={() => navigate(`/admin/students/${item._id}`)} 
                          title="View Student"
                          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditClick(item)} 
                          title="Edit Student"
                          className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleResendCredentials(item)} 
                          title="Resend Login Credentials"
                          disabled={resending === item._id}
                          className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition disabled:opacity-50"
                        >
                          {resending === item._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(item)} 
                          title="Delete Student"
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-green-500/10 text-green-500">
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-medium">
                        {item.isEmailVerified ? 'Verified' : 'Pending OTP'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {(activeTab === 'students' ? students : mentors).length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">No registered records found.</div>
          )}
        </div>
      </Card>

      {/* Custom Add User Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Provision Account"
        description="Create a new admin or mentor account."
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-semibold">
          <div className="space-y-1">
            <label className="text-slate-400 mb-1 block">Full Name</label>
            <Input
              type="text"
              required
              placeholder="John Mentor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 mb-1 block">Email Address</label>
            <Input
              type="email"
              required
              placeholder="mentor@techzonwide.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 mb-1 block">Password</label>
            <Input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 mb-1 block">User Role</label>
            <select
              value={role}
              onChange={(e: any) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
            >
              <option value="mentor">Mentor / Instructor</option>
              <option value="admin">System Administrator</option>
            </select>
          </div>

          <Button type="submit" variant="accent" disabled={saving} className="w-full mt-4">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Provision Profile'}
          </Button>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 font-poppins">
          <div className="w-full max-w-lg glass-card p-6 border border-white/5 space-y-4 text-left relative dark:bg-card-dark max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Edit Student Details</h3>
            <p className="text-xs text-slate-500">Update basic profile information for <strong>{editingStudent.name}</strong>.</p>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-semibold mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Date of Birth</label>
                  <input
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent text-slate-800 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Education / Qualification</label>
                  <input
                    type="text"
                    value={editForm.qualification}
                    onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent text-slate-800 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-border-dark mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-accent px-6 py-2 text-xs flex items-center justify-center min-w-[120px]"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Student Modal */}
      {studentToDelete && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Student?"
          description={`You are about to permanently remove ${studentToDelete.name}.`}
        >
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <p><strong>Student:</strong> {studentToDelete.name}</p>
              <p><strong>Email:</strong> {studentToDelete.email}</p>
            </div>
            <p>This will remove the student's LMS account and access.</p>
            
            <ul className="list-disc pl-5 space-y-1 text-slate-500 text-xs">
              <li>LMS access</li>
              <li>Active enrollments</li>
              <li>Progress records</li>
              <li>Course access</li>
              <li>Student profile</li>
            </ul>
            
            <p className="text-red-500 font-bold text-xs">This action cannot be undone.</p>
          </div>

          <div className="space-y-2 pt-4">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
              Type the student's email to confirm:
            </label>
            <Input
              type="text"
              placeholder={studentToDelete.email}
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              className="w-full focus:border-red-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={deleting || deleteConfirmEmail !== studentToDelete.email}
              className="min-w-[150px]"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Permanently Delete'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Manage Enrollments Modal */}
      {selectedStudent && (
        <Modal
          isOpen={showEnrollmentModal}
          onClose={() => setShowEnrollmentModal(false)}
          title="Manage Enrollments"
          description={`Assign or revoke course access for ${selectedStudent.name}.`}
        >
          <div className="space-y-3 mt-4">
            {courses.map(course => (
              <label key={course._id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-accent border-slate-300 rounded focus:ring-accent"
                  checked={selectedCourses.includes(course._id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCourses([...selectedCourses, course._id]);
                    } else {
                      setSelectedCourses(selectedCourses.filter(id => id !== course._id));
                    }
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{course.title}</p>
                  <p className="text-[10px] text-slate-500">{course.category}</p>
                </div>
              </label>
            ))}
            
            {courses.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">No courses available in the system.</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex justify-end gap-3">
            <Button 
              variant="secondary"
              onClick={() => setShowEnrollmentModal(false)} 
            >
              Cancel
            </Button>
            <Button 
              variant="accent"
              onClick={handleSaveEnrollments}
              disabled={savingEnrollments} 
              className="min-w-[100px]"
            >
              {savingEnrollments ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminStudents;
