import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  ClipboardList, Check, X, Search, Trash2, Loader2, Sparkles, 
  ArrowRight, ArrowLeft, Send, Mail, User, ShieldCheck, BookOpen, Clock, Layers, RefreshCw, Calendar, AlertCircle
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
  googleRowId?: string;
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

interface PlanOption {
  _id: string;
  name: string;
  durationMonths: number;
}

const AdminOnboarding: React.FC = () => {
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [mentors, setMentors] = useState<MentorOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  
  // Lists UI state
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog Modals States
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Approval Form Parameters
  const [approveCourses, setApproveCourses] = useState<string[]>([]);
  const [approvePlanId, setApprovePlanId] = useState('');
  const [approveBatch, setApproveBatch] = useState('Batch A');
  const [approveMentorId, setApproveMentorId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [approveRemarks, setApproveRemarks] = useState('');
  
  // Rejection Parameters
  const [rejectRemarks, setRejectRemarks] = useState('');
  
  // Form submission indicators
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  const fetchMetadata = async () => {
    try {
      const [mentorsRes, coursesRes, plansRes] = await Promise.all([
        api.get('/users?role=Mentor').catch((err) => {
          console.error('Failed to load mentors:', err);
          return { data: { data: [] } };
        }),
        api.get('/courses').catch((err) => {
          console.error('Failed to load courses:', err);
          return { data: { data: [] } };
        }),
        api.get('/plans').catch((err) => {
          console.error('Failed to load plans:', err);
          return { data: { data: [] } };
        })
      ]);
      setMentors(mentorsRes.data.data || []);
      setCourses(coursesRes.data.data || []);
      setPlans(plansRes.data.data || []);
    } catch (err) {
      console.error('Metadata fetch failed:', err);
    }
  };

  useEffect(() => {
    fetchOnboardings();
  }, [statusFilter]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  // Update End Date when Start Date or Plan changes
  useEffect(() => {
    if (!approvePlanId) return;
    const selectedPlan = plans.find(p => p._id === approvePlanId);
    if (!selectedPlan) return;
    
    const start = new Date(startDate);
    const end = new Date(start.setMonth(start.getMonth() + selectedPlan.durationMonths));
    setEndDate(end.toISOString().split('T')[0]);
  }, [startDate, approvePlanId, plans]);

  const openApproveModal = (req: OnboardingRequest) => {
    setSelectedRequest(req);
    setApproveCourses(req.courses?.map(c => c._id) || []);
    setApprovePlanId(req.learningPlan?._id || '');
    setApproveBatch(req.preferredBatch || 'Batch A');
    setApproveMentorId(req.preferredMentor?._id || '');
    setStartDate(new Date().toISOString().split('T')[0]);
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
    if (!approvePlanId) {
      setError('Please select a learning plan.');
      return;
    }
    if (approveCourses.length === 0) {
      setError('Please assign at least one course.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post(`/onboarding/${selectedRequest._id}/approve`, {
        courses: approveCourses,
        learningPlan: approvePlanId,
        batch: approveBatch,
        mentorId: approveMentorId || undefined,
        startDate,
        endDate,
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
    if (!rejectRemarks) {
      setError('Please specify a reason for rejection.');
      return;
    }

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
    <div className="space-y-6 font-poppins text-slate-800 dark:text-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Student Onboarding</h2>
          <p className="text-slate-500 text-xs mt-1">Review onboarding applications, assign batches, and provision LMS student accounts</p>
        </div>
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
            Approved / Imported
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
                  <th className="p-4">Phone</th>
                  <th className="p-4">Chosen Courses</th>
                  <th className="p-4">Batch Preference</th>
                  <th className="p-4">Status</th>
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
                      </div>
                    </td>
                    <td className="p-4 font-semibold">{req.phone}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {req.courses?.map((c) => (
                          <span key={c._id} className="text-[9px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded">
                            {c.title}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-500">
                      {req.preferredBatch || 'Batch A'}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block font-extrabold uppercase text-[9px] px-2 py-0.5 rounded ${
                        req.status === 'approved' 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : req.status === 'rejected'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {req.status === 'approved' ? 'Imported' : req.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setSelectedRequest(req);
                          setShowDetailDrawer(true);
                        }}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition text-[10px] font-bold"
                      >
                        View
                      </button>
                      
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openApproveModal(req)}
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

      {/* STUDENT DETAILS DRAWER */}
      {showDetailDrawer && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-white dark:bg-card-dark h-full p-6 space-y-6 shadow-2xl border-l border-slate-200 dark:border-border-dark overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 dark:border-border-dark">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Student Details Summary</h3>
              <button onClick={() => setShowDetailDrawer(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Full Name</label>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedRequest.fullName}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Email Address</label>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedRequest.email}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Phone / Mobile</label>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedRequest.phone}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Academic Background</label>
                <p className="text-slate-700 dark:text-slate-200">
                  {selectedRequest.college || 'PSG College of Technology'} ({selectedRequest.degree || 'B.E. Computer Science'})
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">City & State</label>
                <p className="text-slate-700 dark:text-slate-200">
                  {selectedRequest.city || 'Coimbatore'}, {selectedRequest.state || 'Tamil Nadu'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Chosen Courses</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedRequest.courses?.map((c) => (
                    <span key={c._id} className="text-[9px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">
                      {c.title}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Submit Timestamp</label>
                <p className="text-slate-500">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Onboarding Source</label>
                <p className="text-slate-500 font-bold text-accent">
                  {selectedRequest.googleRowId ? `Google Sheet Row ID: ${selectedRequest.googleRowId}` : 'Direct Webhook Onboarding'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 dark:border-border-dark">
              <button
                onClick={() => setShowDetailDrawer(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs"
              >
                Close Drawer
              </button>
              {selectedRequest.status === 'pending' && (
                <button
                  onClick={() => {
                    setShowDetailDrawer(false);
                    openApproveModal(selectedRequest);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 text-xs"
                >
                  Configure Approval
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL SIMPLIFIED MODAL PANEL */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-border-dark p-6 space-y-6 shadow-xl text-xs font-semibold">
            <div className="flex items-center justify-between border-b pb-3 dark:border-border-dark">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Configure Student Onboarding</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Approve request and spawn credentials immediately</p>
              </div>
              <button onClick={() => setShowApproveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-500 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-400 block text-[10px] uppercase">Student Name</label>
                <input
                  type="text"
                  readOnly
                  value={selectedRequest.fullName}
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-slate-800 outline-none text-slate-600 cursor-not-allowed border border-transparent text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block text-[10px] uppercase">Login Email Address</label>
                <input
                  type="text"
                  readOnly
                  value={selectedRequest.email}
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-slate-800 outline-none text-slate-600 cursor-not-allowed border border-transparent text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block text-[10px] uppercase">Course Context</label>
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-secondary-dark flex flex-wrap gap-1">
                  {selectedRequest.courses?.map(c => (
                    <span key={c._id} className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">{c.title}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block text-[10px] uppercase">Select Learning Plan</label>
                <select
                  value={approvePlanId}
                  onChange={(e) => setApprovePlanId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark text-xs"
                >
                  <option value="">Select learning plan...</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} ({p.durationMonths} Months)</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block text-[10px] uppercase">Assign Learning Batch</label>
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

              <div className="space-y-1">
                <label className="text-slate-500 block text-[10px] uppercase">Assign Instructor Mentor</label>
                <select
                  value={approveMentorId}
                  onChange={(e) => setApproveMentorId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark text-xs"
                >
                  <option value="">No Mentor Assigned</option>
                  {mentors.map((m) => (
                    <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block text-[10px] uppercase">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block text-[10px] uppercase">Expiry End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 dark:border-border-dark">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={submitting}
                className="px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 flex items-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Approve & Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL DIALOG */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-border-dark p-6 space-y-6 shadow-xl text-xs font-semibold">
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
