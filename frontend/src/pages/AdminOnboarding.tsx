import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  ClipboardList, Check, X, Search, Trash2, Loader2, Sparkles, 
  ArrowRight, ArrowLeft, Send, Mail, User, ShieldCheck, BookOpen, Clock, Layers, RefreshCw
} from 'lucide-react';

interface OnboardingRequest {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  degree: string;
  city: string;
  state: string;
  courses: { _id: string; title: string }[];
  learningPlan: { _id: string; name: string; durationMonths: number };
  preferredBatch: string;
  preferredMentor?: { _id: string; name: string };
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  createdAt: string;
}

interface MentorOption {
  _id: string;
  name: string;
  email: string;
}

interface CourseOption {
  _id: string;
  title: string;
}

const AdminOnboarding: React.FC = () => {
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [mentors, setMentors] = useState<MentorOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  
  // Lists UI state
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog Modals States
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Approval Wizard Parameters
  const [wizardStep, setWizardStep] = useState(1);
  const [approveCourses, setApproveCourses] = useState<string[]>([]);
  const [approvePlan, setApprovePlan] = useState('');
  const [approveBatch, setApproveBatch] = useState('Batch A');
  const [approveMentor, setApproveMentor] = useState('');
  const [approveDuration, setApproveDuration] = useState(6);
  const [approveRemarks, setApproveRemarks] = useState('');
  
  // Rejection Parameters
  const [rejectRemarks, setRejectRemarks] = useState('');
  
  // Form submission indicators
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  const handleSyncSheets = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/onboarding/sync');
      alert(res.data.message || 'Sync completed successfully!');
      fetchOnboardings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to sync Google Sheets');
    } finally {
      setSyncing(false);
    }
  };

  const fetchOnboardings = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/onboarding?status=${statusFilter}`);
      setRequests(res.data.data || []);
    } catch (err) {
      console.error('Error fetching onboarding applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMentorsAndCourses = async () => {
    try {
      const [mentorsRes, coursesRes] = await Promise.all([
        api.get('/users?role=Mentor').catch((err) => {
          console.error('Failed to load mentors:', err);
          return { data: { data: [] } };
        }),
        api.get('/courses').catch((err) => {
          console.error('Failed to load courses:', err);
          return { data: { data: [] } };
        })
      ]);
      setMentors(mentorsRes.data.data || []);
      setCourses(coursesRes.data.data || []);
    } catch (err) {
      setMentors([
        { _id: 'dev-mentor-id', name: 'Instructor Mentor (Default)', email: 'mentor@techzonwide.com' }
      ]);
      setCourses([]);
    }
  };

  useEffect(() => {
    fetchOnboardings();
  }, [statusFilter]);

  useEffect(() => {
    fetchMentorsAndCourses();
  }, []);

  const openApproveWizard = (req: OnboardingRequest) => {
    setSelectedRequest(req);
    setWizardStep(1);
    setApproveCourses(req.courses?.map(c => c._id) || []);
    setApprovePlan(req.learningPlan?._id || '');
    setApproveBatch(req.preferredBatch || 'Batch A');
    setApproveMentor(req.preferredMentor?._id || '');
    setApproveDuration(req.learningPlan?.durationMonths || 6);
    setApproveRemarks('');
    setError('');
    setShowApproveModal(true);
  };

  const openRejectDialog = (req: OnboardingRequest) => {
    setSelectedRequest(req);
    setRejectRemarks('');
    setError('');
    setShowRejectModal(true);
  };

  const handleCourseToggle = (courseId: string) => {
    if (approveCourses.includes(courseId)) {
      setApproveCourses(approveCourses.filter((id) => id !== courseId));
    } else {
      setApproveCourses([...approveCourses, courseId]);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    setError('');

    try {
      await api.post(`/onboarding/${selectedRequest._id}/approve`, {
        courses: approveCourses,
        learningPlan: approvePlan,
        batch: approveBatch,
        mentorId: approveMentor || undefined,
        durationMonths: approveDuration,
        remarks: approveRemarks,
      });
      setShowApproveModal(false);
      fetchOnboardings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    setError('');

    try {
      await api.post(`/onboarding/${selectedRequest._id}/reject`, {
        remarks: rejectRemarks,
      });
      setShowRejectModal(false);
      fetchOnboardings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this onboarding request?')) return;
    try {
      await api.delete(`/onboarding/${id}`);
      fetchOnboardings();
    } catch (err) {
      console.error('Error deleting application request:', err);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const term = searchQuery.toLowerCase();
    return (
      req.fullName.toLowerCase().includes(term) ||
      req.email.toLowerCase().includes(term) ||
      req.college.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Onboarding Requests</h2>
          <p className="text-slate-500 text-xs mt-1">Review student applications, assign batches, and activate LMS credentials</p>
        </div>
        <button
          onClick={handleSyncSheets}
          disabled={syncing}
          className="btn-accent py-2 px-4 flex items-center gap-1.5"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sync Google Sheets
        </button>
      </div>

      {/* Filter and search bar row */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex rounded-xl bg-slate-100 dark:bg-card-dark p-1 border border-slate-200 dark:border-border-dark w-fit">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              statusFilter === 'pending'
                ? 'bg-primary text-white shadow'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Pending Requests
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              statusFilter === 'approved'
                ? 'bg-primary text-white shadow'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              statusFilter === 'rejected'
                ? 'bg-primary text-white shadow'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Rejected
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark outline-none focus:border-accent text-xs transition"
          />
        </div>
      </div>

      {/* Requests table listing */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <ClipboardList className="w-12 h-12 mx-auto text-slate-400" />
            <h4 className="font-bold text-slate-600 dark:text-slate-300">No requests found</h4>
            <p className="text-xs text-slate-400">Applications will populate here when prospects submit the onboarding forms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-secondary-dark font-bold text-slate-500">
                <tr>
                  <th className="p-4">Student Details</th>
                  <th className="p-4">Academic Background</th>
                  <th className="p-4">Chosen Courses</th>
                  <th className="p-4">Selected Plan</th>
                  <th className="p-4">Preferred Batch</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-border-dark">
                {filteredRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">{req.fullName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{req.email}</p>
                        <p className="text-[10px] text-slate-400">{req.phone}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold">{req.college}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{req.degree}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {req.courses?.map((c) => (
                          <span key={c._id} className="text-[9px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded">
                            {c.title}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-accent">{req.learningPlan?.name || 'Self-Paced'}</span>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-medium text-[10px] text-slate-500">
                        {req.preferredBatch || 'Batch A'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setSelectedRequest(req);
                          setShowDetailModal(true);
                        }}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition text-[10px] font-bold"
                      >
                        Details
                      </button>
                      
                      {statusFilter === 'pending' && (
                        <>
                          <button
                            onClick={() => openApproveWizard(req)}
                            className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition text-[10px] font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectDialog(req)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition text-[10px] font-bold"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleDelete(req._id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL BOX */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-border-dark p-6 space-y-6 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b pb-3 dark:border-border-dark">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Application Request Details</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Full Name</p>
                <p className="font-semibold text-slate-700 dark:text-slate-200">{selectedRequest.fullName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Email</p>
                <p className="font-semibold text-slate-700 dark:text-slate-200">{selectedRequest.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Phone</p>
                <p className="font-semibold text-slate-700 dark:text-slate-200">{selectedRequest.phone}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Preferred Batch</p>
                <p className="font-semibold text-slate-700 dark:text-slate-200">{selectedRequest.preferredBatch}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-[10px] uppercase font-bold text-slate-400">College & Degree</p>
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  {selectedRequest.college} ({selectedRequest.degree})
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">City & State</p>
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  {selectedRequest.city}, {selectedRequest.state}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Status</p>
                <span className={`inline-block font-bold uppercase text-[9px] px-2 py-0.5 rounded ${
                  selectedRequest.status === 'approved' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : selectedRequest.status === 'rejected'
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {selectedRequest.status}
                </span>
              </div>
            </div>

            {selectedRequest.remarks && (
              <div className="p-3 bg-slate-50 dark:bg-secondary-dark rounded-xl">
                <p className="text-[10px] uppercase font-bold text-slate-400">Status Remarks</p>
                <p className="mt-1 font-medium">{selectedRequest.remarks}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-4 dark:border-border-dark">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 text-slate-700 dark:text-slate-300"
              >
                Close View
              </button>
              {selectedRequest.status === 'pending' && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openApproveWizard(selectedRequest);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600"
                >
                  Configure Approval
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPROVE 8-STEP WIZARD MODAL */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-border-dark p-6 space-y-6 shadow-xl text-xs">
            {/* Header with Step Indicator */}
            <div className="flex items-center justify-between border-b pb-3 dark:border-border-dark">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Approval Wizard</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Step {wizardStep} of 8</p>
              </div>
              <button onClick={() => setShowApproveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-500 font-bold">
                {error}
              </div>
            )}

            {/* WIZARD CONTENT STEPS */}
            <div className="space-y-4 min-h-[160px] flex flex-col justify-center">
              
              {/* STEP 1: REVIEW STUDENT */}
              {wizardStep === 1 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <User className="w-4 h-4 text-accent" /> Step 1: Review Student Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-slate-600 dark:text-slate-300">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">Full Name</p>
                      <p className="font-semibold">{selectedRequest.fullName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">Email Address</p>
                      <p className="font-semibold">{selectedRequest.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">Contact Phone</p>
                      <p className="font-semibold">{selectedRequest.phone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">Academic Background</p>
                      <p className="font-semibold">{selectedRequest.college} ({selectedRequest.degree})</p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: ASSIGN COURSE(S) */}
              {wizardStep === 2 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-accent" /> Step 2: Assign Learning Program Courses
                  </h4>
                  <p className="text-slate-500 text-[10px]">Select or override the courses the student will get access to:</p>
                  <div className="max-h-[120px] overflow-y-auto space-y-2">
                    {courses.map((courseOption) => (
                      <label key={courseOption._id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-border-dark cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 select-none">
                        <input
                          type="checkbox"
                          checked={approveCourses.includes(courseOption._id)}
                          onChange={() => handleCourseToggle(courseOption._id)}
                          className="w-4 h-4 text-accent accent-accent rounded"
                        />
                        <span className="font-bold">{courseOption.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: ASSIGN LEARNING PLAN */}
              {wizardStep === 3 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-accent" /> Step 3: Select Learning Plan Tier
                  </h4>
                  <p className="text-slate-500 text-[10px]">Determines what features (live webinars, doubt sessions) are permitted:</p>
                  <select
                    value={approvePlan}
                    onChange={(e) => setApprovePlan(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark text-xs"
                  >
                    <option value={selectedRequest.learningPlan?._id}>{selectedRequest.learningPlan?.name}</option>
                  </select>
                </div>
              )}

              {/* STEP 4: ASSIGN BATCH */}
              {wizardStep === 4 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-accent" /> Step 4: Assign Learning Batch
                  </h4>
                  <select
                    value={approveBatch}
                    onChange={(e) => setApproveBatch(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark text-xs"
                  >
                    <option value="Batch A">Batch A (Weekdays morning)</option>
                    <option value="Batch B">Batch B (Weekdays evening)</option>
                    <option value="Batch C">Batch C (Weekends batch)</option>
                  </select>
                </div>
              )}

              {/* STEP 5: ASSIGN MENTOR */}
              {wizardStep === 5 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <User className="w-4 h-4 text-accent" /> Step 5: Assign Instructor Mentor
                  </h4>
                  <select
                    value={approveMentor}
                    onChange={(e) => setApproveMentor(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark text-xs"
                  >
                    <option value="">No Mentor Assigned</option>
                    {mentors.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* STEP 6: SET ACCESS DURATION */}
              {wizardStep === 6 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-accent" /> Step 6: Set Access Duration Timeline
                  </h4>
                  <p className="text-slate-500 text-[10px]">LMS access will automatically expire after the configured duration:</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={approveDuration}
                      onChange={(e) => setApproveDuration(parseInt(e.target.value) || 6)}
                      className="w-32 p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark text-xs"
                    />
                    <span className="font-bold text-slate-500">Months from today</span>
                  </div>
                </div>
              )}

              {/* STEP 7: GENERATE CREDENTIALS */}
              {wizardStep === 7 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-accent" /> Step 7: Account Security Credentials
                  </h4>
                  <div className="p-4 bg-emerald-500/10 rounded-xl space-y-2 border border-emerald-500/20">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">Automated Provisioning Enabled</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      A random temporary password string will be securely hashed using bcrypt and stored in the database. The student is forced to change their password on first sign-in.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 8: CONFIRM & SEND WELCOME EMAIL */}
              {wizardStep === 8 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-accent" /> Step 8: Welcome Email & Finish
                  </h4>
                  <p className="text-slate-500 text-[10px]">Add any onboarding comments or remarks for auditing logs:</p>
                  <textarea
                    placeholder="Approval onboarding processing remarks..."
                    value={approveRemarks}
                    onChange={(e) => setApproveRemarks(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark text-xs h-16 resize-none"
                  />
                  <div className="p-3 bg-slate-50 dark:bg-secondary-dark rounded-lg text-slate-500 leading-normal">
                    On finish, account credentials, assigned batch, and the LMS login URL will be automatically mailed to <strong>{selectedRequest.email}</strong>.
                  </div>
                </div>
              )}

            </div>

            {/* Navigation Actions */}
            <div className="flex justify-between items-center border-t pt-4 dark:border-border-dark">
              <button
                type="button"
                onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                disabled={wizardStep === 1}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 disabled:opacity-40 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              
              {wizardStep < 8 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(prev => Math.min(8, prev + 1))}
                  className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary-light flex items-center gap-1"
                >
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Finish & Activate</>}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* REJECT MODAL DIALOG */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-border-dark p-6 space-y-6 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b pb-3 dark:border-border-dark">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Reject Request</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Decline request for {selectedRequest.fullName}</p>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-500 font-bold">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">remarks / rejection reason</label>
              <textarea
                placeholder="Incomplete application profile."
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark text-xs h-24 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 dark:border-border-dark">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 flex items-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOnboarding;
