import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { 
  RefreshCw, Check, X, Search, Loader2, Sparkles, 
  ArrowRight, ArrowLeft, Send, Mail, User, ShieldCheck, BookOpen, Clock, AlertTriangle, Layers, Calendar, Eye, Ban
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
  learningPlan?: { _id: string; name: string; durationMonths: number };
  preferredBatch: string;
  preferredMentor?: { _id: string; name: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED';
  remarks?: string;
  createdAt: string;
  googleRowId?: string;
  rawFormData?: any;
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
  
  // Stats summary state
  const [syncedCount, setSyncedCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Never');
  
  // UI Tab State
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED'>('PENDING');

  // UI lists state
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog Modals
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationStats, setMigrationStats] = useState<any>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  
  const [rejectReason, setRejectReason] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchOnboardings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/onboarding/requests');
      const allOnboardings: OnboardingRequest[] = res.data.data || [];
      const sheetsOnboardings = allOnboardings.filter(r => r.googleRowId);
      setRequests(sheetsOnboardings);
    } catch (err: any) {
      console.error('Error fetching sheets requests:', err);
      toast.error('Unable to load onboarding requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchMentorsAndCourses = async () => {
    try {
      const [mentorsRes, coursesRes] = await Promise.all([
        api.get('/users?role=Mentor').catch(() => ({ data: { data: [] } })),
        api.get('/courses').catch(() => ({ data: { data: [] } }))
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

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await api.get('/admin/onboarding/sync/test');
      if (res.data.success) {
        toast.success(res.data.message || 'Connection successful!');
      } else {
        toast.error('Connection test failed.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Connection test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const openMigrationPreview = async () => {
    setIsMigrating(true);
    try {
      const res = await api.post('/admin/onboarding/import-all-google-form?dryRun=true');
      setMigrationStats(res.data.stats);
      setShowMigrationModal(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate migration preview');
    } finally {
      setIsMigrating(false);
    }
  };

  const executeMigration = async () => {
    setIsMigrating(true);
    try {
      const res = await api.post('/admin/onboarding/import-all-google-form?dryRun=false');
      toast.success(res.data.message || 'Migration completed successfully!');
      setShowMigrationModal(false);
      fetchOnboardings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRepair = async () => {
    setIsRepairing(true);
    try {
      const res = await api.post('/admin/onboarding/repair');
      const s = res.data.stats;
      toast.success(
        `Repair Complete:\nMissing: ${s.missingOnboardingRequests}\nRepaired: ${s.repaired}\nAlready Present: ${s.alreadyPresent}\nFailed: ${s.failed}`,
        { duration: 8000, style: { whiteSpace: 'pre-line' } }
      );
      fetchOnboardings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Repair failed');
    } finally {
      setIsRepairing(false);
    }
  };

  const handleSyncSheets = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/admin/onboarding/sync');
      const syncData = res.data.summary || {};
      
      setSyncedCount(prev => prev + (syncData.created || 0)); // New Requests
      setDuplicateCount(prev => prev + (syncData.alreadySynced || 0) + (syncData.updated || 0)); // Already Pending / Updated
      setFailedCount(prev => prev + (syncData.skipped || 0) + (syncData.failed || 0));
      
      setLastSyncTime(new Date().toLocaleTimeString());
      alert(res.data.message || 'Synchronization successfully completed!');
      fetchOnboardings(); // Auto refresh
    } catch (err: any) {
      const data = err.response?.data;
      if (data && data.message) {
         alert(`Sync Failed: ${data.message}\n\nError Code: ${data.code || 'UNKNOWN'}`);
      } else {
         alert('Google Spreadsheet synchronization failed. Please verify credentials in system settings.');
      }
    } finally {
      setSyncing(false);
    }
  };

  const openDetails = (req: OnboardingRequest) => {
    setSelectedRequest(req);
    setSelectedCourseId(req.courses?.[0]?._id || '');
    setError('');
    setShowDetailsModal(true);
  };



  const handleApprove = async () => {
    if (!selectedRequest) return;
    if (!selectedCourseId) {
      setError('Please select a course.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const response = await api.post(`/admin/onboarding/requests/${selectedRequest._id}/approve`, {
        courseId: selectedCourseId,
      });
      
      const { student, course, enrollment, access, email } = response.data;
      
      toast.success(
        `Student Approved Successfully\n\nStudent:\n${student.name}\n\nEmail:\n${student.email}\n\nCourse:\n${course.name}\n\nEnrollment:\n${enrollment.status}\n\nLMS Access:\n${access.granted ? 'GRANTED' : 'DENIED'}\n\nEmail:\n${email.sent ? 'Sent' : 'Failed - ' + email.reason}`,
        { duration: 8000, style: { whiteSpace: 'pre-line', textAlign: 'left' } }
      );
      
      setShowDetailsModal(false);
      fetchOnboardings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve onboarding student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    setError('');
    
    try {
      const response = await api.post(`/admin/onboarding/requests/${selectedRequest._id}/resend-email`);
      const { email } = response.data;
      
      if (email.sent) {
        toast.success('Approval email sent successfully.');
      } else {
        toast.error(`Email failed: ${email.error}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend email');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    setError('');

    try {
      await api.post(`/admin/onboarding/requests/${selectedRequest._id}/reject`, { reason: rejectReason });
      setShowDetailsModal(false);
      fetchOnboardings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  const normalizeStatus = (s: string) => String(s || '').trim().toUpperCase();

  const filteredRequests = requests.filter((req) => {
    const term = searchQuery.toLowerCase();
    const fullName = String(req.fullName || '').toLowerCase();
    const email = String(req.email || '').toLowerCase();
    const matchSearch = fullName.includes(term) || email.includes(term);
    return matchSearch && normalizeStatus(req.status) === activeTab;
  });

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Google Form Responses Sync</h2>
          <p className="text-slate-500 text-xs mt-1">Import student records from your restricted Google spreadsheet and provision accounts</p>
        </div>
        <div className="flex gap-2">
          {user?.role === 'SuperAdmin' && (
            <button
              onClick={handleRepair}
              disabled={isRepairing || syncing || testingConnection || isMigrating}
              className="btn-outline py-2.5 px-4 flex items-center gap-1.5 text-xs font-bold rounded-xl border border-indigo-200 text-indigo-500 hover:bg-indigo-50"
            >
              {isRepairing ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              Repair Missing
            </button>
          )}
          <button
            onClick={openMigrationPreview}
            disabled={isMigrating || syncing || testingConnection}
            className="btn-outline py-2.5 px-4 flex items-center gap-1.5 text-xs font-bold rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50"
          >
            {isMigrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            One-Time Migration
          </button>
          <button
            onClick={handleTestConnection}
            disabled={testingConnection || syncing || isMigrating}
            className="btn-outline py-2.5 px-4 flex items-center gap-1.5 text-xs font-bold rounded-xl border border-slate-200"
          >
            {testingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Test Connection
          </button>
          <button
            onClick={handleSyncSheets}
            disabled={syncing || testingConnection || isMigrating}
            className="btn-accent py-2.5 px-4 flex items-center gap-1.5"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Google Sheet Now
          </button>
        </div>
      </div>

      {/* Sync statistics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Last Sync Time</p>
          <p className="text-sm font-extrabold text-slate-700 dark:text-white mt-1">{lastSyncTime}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">New Requests</p>
          <p className="text-sm font-extrabold text-emerald-500 mt-1">+{syncedCount}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Already Pending/Updated</p>
          <p className="text-sm font-extrabold text-amber-500 mt-1">{duplicateCount}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Failed / Skipped</p>
          <p className="text-sm font-extrabold text-red-500 mt-1">{failedCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-secondary-dark p-1 rounded-xl">
        {(['PENDING', 'APPROVED', 'REJECTED', 'FAILED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === tab
                ? 'bg-white dark:bg-card-dark text-accent shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {tab} ({requests.filter(r => normalizeStatus(r.status) === tab).length})
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">{activeTab} Requests</h3>
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
            <h4 className="font-bold text-slate-600 dark:text-slate-300">No {activeTab.toLowerCase()} requests found</h4>
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
                  <th className="p-4">Course</th>
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
                        {req.courses?.map((c, i) => (
                          <span key={i} className="text-[9px] bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded">
                            {c.title}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block font-extrabold uppercase text-[9px] px-2 py-0.5 rounded ${
                        req.status === 'APPROVED' 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : req.status === 'REJECTED'
                          ? 'bg-red-500/10 text-red-500'
                          : req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openDetails(req)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 transition text-[10px] font-bold flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MIGRATION MODAL */}
      {showMigrationModal && migrationStats && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-card-dark rounded-2xl border border-rose-200 dark:border-rose-900 p-6 space-y-6 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b pb-3 dark:border-border-dark border-rose-100">
              <h3 className="text-lg font-bold text-rose-600 dark:text-rose-500 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> ONE-TIME GOOGLE FORM IMPORT
              </h3>
              <button onClick={() => setShowMigrationModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                This will import all valid Google Form submissions, including submissions with duplicate emails. 
                Existing LMS students will NOT be deleted. Google Form/Sheet will NOT be modified. 
                Duplicate FORM submissions will be allowed based on unique sourceRowId.
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between"><span className="text-slate-500">Total Google Sheet rows:</span> <span className="font-bold">{migrationStats.totalRows}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Already imported:</span> <span className="font-bold">{migrationStats.alreadyImported}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Duplicate emails:</span> <span className="font-bold text-rose-500">{migrationStats.duplicateEmails}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Rows to import:</span> <span className="font-bold text-emerald-500">{migrationStats.rowsToImport}</span></div>
                <div className="flex justify-between pt-2 border-t mt-2 border-slate-200"><span className="text-slate-500">Existing active users:</span> <span className="font-bold">{migrationStats.existingUsers}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-border-dark">
              <button
                onClick={() => setShowMigrationModal(false)}
                disabled={isMigrating}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={executeMigration}
                disabled={isMigrating}
                className="px-4 py-2 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-600 flex items-center gap-2"
              >
                {isMigrating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} 
                Start Migration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-border-dark p-6 space-y-6 shadow-xl text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 dark:border-border-dark">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Student Details</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="overflow-y-auto space-y-4 flex-1 pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 border-b pb-1 dark:border-border-dark">Personal Information</h4>
                  <p><span className="font-bold text-slate-500">Name:</span> {selectedRequest.fullName}</p>
                  <p><span className="font-bold text-slate-500">Email:</span> {selectedRequest.email}</p>
                  <p><span className="font-bold text-slate-500">Phone:</span> {selectedRequest.phone}</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 border-b pb-1 dark:border-border-dark">Course Selection</h4>
                  {selectedRequest.status === 'PENDING' ? (
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark text-xs mb-3"
                    >
                      <option value="">Select a Course</option>
                      {courses.map((c) => (
                        <option key={c._id} value={c._id}>{c.title}</option>
                      ))}
                    </select>
                  ) : (
                    <p><span className="font-bold text-slate-500">Course:</span> {selectedRequest.courses?.map(c => c.title).join(', ')}</p>
                  )}
                  <p><span className="font-bold text-slate-500">Google Form Original Batch:</span> {selectedRequest.preferredBatch || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 border-b pb-1 dark:border-border-dark">Google Form Raw Data</h4>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-border-dark max-h-48 overflow-y-auto">
                  <pre className="text-[10px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono">
                    {JSON.stringify(selectedRequest.rawFormData, null, 2)}
                  </pre>
                </div>
              </div>
              
              {selectedRequest.status === 'PENDING' && (
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 border-b pb-1 dark:border-border-dark">Rejection Reason (Optional)</h4>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-secondary-dark"
                  />
                </div>
              )}
              {error && <div className="text-red-500 font-bold">{error}</div>}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-border-dark">
              {selectedRequest.status === 'PENDING' && (
                <>
                  <button
                    onClick={handleReject}
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-bold flex items-center gap-1"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 flex items-center gap-1"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Approve Student</>}
                  </button>
                </>
              )}
              {selectedRequest.status === 'APPROVED' && (
                <button
                  onClick={handleResendEmail}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white font-bold hover:bg-blue-600 flex items-center gap-1"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Mail className="w-3.5 h-3.5" /> Resend Approval Email</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOnboarding;
