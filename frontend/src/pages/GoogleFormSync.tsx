import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  RefreshCw, Check, X, Search, Loader2, Sparkles, 
  ArrowRight, ArrowLeft, Send, Mail, User, ShieldCheck, BookOpen, Clock, AlertTriangle, Layers, Calendar
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

const GoogleFormSync: React.FC = () => {
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [mentors, setMentors] = useState<MentorOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  
  // Stats summary state
  const [totalRows, setTotalRows] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Never');

  // UI lists state
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog Modals
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);

  // Approval Wizard Parameters
  const [wizardStep, setWizardStep] = useState(1);
  const [approveCourses, setApproveCourses] = useState<string[]>([]);
  const [approvePlan, setApprovePlan] = useState('');
  const [approveBatch, setApproveBatch] = useState('Batch A');
  const [approveMentor, setApproveMentor] = useState('');
  const [approveDuration, setApproveDuration] = useState(6);
  const [approveRemarks, setApproveRemarks] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchOnboardings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/onboarding');
      // Filter Google Sheets source onboardings
      const allOnboardings: OnboardingRequest[] = res.data.data || [];
      const sheetsOnboardings = allOnboardings.filter(r => r.googleRowId);
      setRequests(sheetsOnboardings);

      // Accumulate stats based on list
      setTotalRows(sheetsOnboardings.length + duplicateCount);
    } catch (err) {
      console.error('Error fetching sheets requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMentorsAndCourses = async () => {
    try {
      const [mentorsRes, coursesRes] = await Promise.all([
        api.get('/auth/users?role=mentor'),
        api.get('/courses')
      ]);
      setMentors(mentorsRes.data.data || []);
      setCourses(coursesRes.data.data || []);
    } catch (err) {
      console.error('Error loading mentors/courses list:', err);
    }
  };

  useEffect(() => {
    fetchOnboardings();
    fetchMentorsAndCourses();
  }, []);

  const handleSyncSheets = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/google/sync');
      const syncData = res.data.data;
      setSyncedCount(prev => prev + syncData.synced);
      setDuplicateCount(prev => prev + syncData.duplicates);
      setFailedCount(prev => prev + syncData.skipped);
      setLastSyncTime(new Date().toLocaleTimeString());
      alert(res.data.message || 'Synchronization successfully completed!');
      fetchOnboardings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Google Spreadsheet synchronization failed. Please verify credentials in system settings.');
    } finally {
      setSyncing(false);
    }
  };

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
      setError(err.response?.data?.message || 'Failed to approve onboarding student');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const term = searchQuery.toLowerCase();
    return (
      req.fullName.toLowerCase().includes(term) ||
      req.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Google Form Responses Sync</h2>
          <p className="text-slate-500 text-xs mt-1">Import student records from your restricted Google spreadsheet and provision accounts</p>
        </div>
        <button
          onClick={handleSyncSheets}
          disabled={syncing}
          className="btn-accent py-2.5 px-4 flex items-center gap-1.5"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sync Google Sheet Now
        </button>
      </div>

      {/* Sync statistics row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Last Sync Time</p>
          <p className="text-sm font-extrabold text-slate-700 dark:text-white mt-1">{lastSyncTime}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Synced in Session</p>
          <p className="text-sm font-extrabold text-emerald-500 mt-1">+{syncedCount}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Synced Rows</p>
          <p className="text-sm font-extrabold text-primary mt-1">{requests.length}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Duplicates Detected</p>
          <p className="text-sm font-extrabold text-amber-500 mt-1">{duplicateCount}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Skipped Rows</p>
          <p className="text-sm font-extrabold text-red-500 mt-1">{failedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Imported Sheet Responses</h3>
        <div className="relative w-72">
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

      {/* Synchronized Table list */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <AlertTriangle className="w-12 h-12 mx-auto text-slate-400" />
            <h4 className="font-bold text-slate-600 dark:text-slate-300">No sheets data found</h4>
            <p className="text-xs text-slate-400">Click the Sync button to fetch registration records from your Google Spreadsheet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-secondary-dark font-bold text-slate-500">
                <tr>
                  <th className="p-4">Row ID</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Selected Course</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-border-dark">
                {filteredRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                    <td className="p-4 font-bold text-slate-400">{req.googleRowId || 'N/A'}</td>
                    <td className="p-4 font-bold text-slate-800 dark:text-white">{req.fullName}</td>
                    <td className="p-4 font-semibold text-slate-500">{req.email}</td>
                    <td className="p-4 font-semibold text-slate-500">{req.phone}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {req.courses?.map((c) => (
                          <span key={c._id} className="text-[9px] bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded">
                            {c.title}
                          </span>
                        ))}
                      </div>
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
                    <td className="p-4 text-right">
                      {req.status === 'pending' && (
                        <button
                          onClick={() => openApproveWizard(req)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition text-[10px] font-bold"
                        >
                          Approve & Provision
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* APPROVAL WIZARD MODAL */}
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
                      <p className="text-[10px] font-bold text-slate-400">Preferred Batch</p>
                      <p className="font-semibold">{selectedRequest.preferredBatch || 'Batch A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: ASSIGN LEARNING PLAN */}
              {wizardStep === 2 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-accent" /> Step 2: Select Learning Plan Tier
                  </h4>
                  <select
                    value={approvePlan}
                    onChange={(e) => setApprovePlan(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark text-xs"
                  >
                    <option value="">Select Learning Plan</option>
                    <option value="self-paced">Self-Paced Plan</option>
                    <option value="mentor-led">Mentor-Led Plan</option>
                    <option value="advanced-mentor">Advanced Mentor Plan</option>
                  </select>
                </div>
              )}

              {/* STEP 3: ASSIGN BATCH */}
              {wizardStep === 3 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-accent" /> Step 3: Assign Learning Batch
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

              {/* STEP 4: ASSIGN MENTOR */}
              {wizardStep === 4 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <User className="w-4 h-4 text-accent" /> Step 4: Assign Instructor Mentor
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

              {/* STEP 5: ACCESS START & EXPIRY DURATION */}
              {wizardStep === 5 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-accent" /> Step 5: Set Access Duration Timeline
                  </h4>
                  <p className="text-slate-500 text-[10px]">Enrollment Validity Duration:</p>
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

              {/* STEP 6: CREATE STUDENT USER */}
              {wizardStep === 6 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-accent" /> Step 6: Security Credentials
                  </h4>
                  <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <p className="font-bold text-emerald-600">Secure Account Provisioning</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium mt-1">
                      A random temporary password will be securely compiled for the user. Password reset will be forced on first sign-in.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 7: ASSIGN COURSE(S) */}
              {wizardStep === 7 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-accent" /> Step 7: Assign Learning Program Courses
                  </h4>
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

              {/* STEP 8: WELCOME EMAIL & FINISH */}
              {wizardStep === 8 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs border-b pb-1 dark:border-border-dark flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-accent" /> Step 8: Welcome Email & Finish
                  </h4>
                  <textarea
                    placeholder="Approval comments or remarks..."
                    value={approveRemarks}
                    onChange={(e) => setApproveRemarks(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark text-xs h-16 resize-none"
                  />
                  <div className="p-3 bg-slate-50 dark:bg-secondary-dark rounded-lg text-slate-500 leading-normal">
                    LMS access will be automatically mailed to <strong>{selectedRequest.email}</strong>.
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
    </div>
  );
};

export default GoogleFormSync;
