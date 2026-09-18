import React, { useState, useEffect } from 'react';
import { Mail, Users, Send, FileText, CheckCircle, XCircle, Search, Clock, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Student {
  _id: string;
  name: string;
  email: string;
  status: string;
}

interface Campaign {
  _id: string;
  subject: string;
  templateType: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  createdBy: { name: string; email: string };
}

const AdminEmailManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'drafts'>('compose');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Composer State
  const [subject, setSubject] = useState('');
  const [templateType, setTemplateType] = useState('live_class_announcement');
  const [htmlContent, setHtmlContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (activeTab === 'compose') {
      fetchStudents();
    } else if (activeTab === 'history' || activeTab === 'drafts') {
      fetchCampaigns();
    }
  }, [activeTab]);

  const fetchStudents = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await api.get('/users/students');
      if (res.data.success) {
        setStudents(res.data.data || []);
      }
    } catch (error: any) {
      setHasError(true);
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/email-management');
      if (res.data.success) {
        setCampaigns(res.data.data || []);
      }
    } catch (error: any) {
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const filteredStudentIds = students
        .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(s => s._id);
      setSelectedStudentIds(filteredStudentIds);
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (selectedStudentIds.length === 0) return toast.error('Please select at least one student');
    if (!subject.trim()) return toast.error('Subject is required');
    if (!htmlContent.trim()) return toast.error('Email content is required');

    if (!window.confirm(`Are you sure you want to send this email to ${selectedStudentIds.length} students?`)) return;

    setIsSending(true);
    try {
      const res = await api.post('/admin/email-management/send', {
        recipientIds: selectedStudentIds,
        subject,
        htmlContent,
        templateType
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setSubject('');
        setHtmlContent('');
        setSelectedStudentIds([]);
        setActiveTab('history');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send emails');
    } finally {
      setIsSending(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto text-slate-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-poppins flex items-center gap-3 text-white">
            <div className="p-2.5 bg-accent/20 rounded-xl">
              <Mail className="text-accent w-7 h-7" />
            </div>
            Email Management
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-xl">
            Send important announcements and class updates directly to your students with our rich text email composer.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-8 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('compose')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all relative ${
            activeTab === 'compose' 
              ? 'text-accent' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-t-lg'
          }`}
        >
          <Send size={16} /> Compose Email
          {activeTab === 'compose' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent shadow-[0_-2px_10px_rgba(var(--color-accent),0.5)]"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all relative ${
            activeTab === 'history' 
              ? 'text-accent' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-t-lg'
          }`}
        >
          <Clock size={16} /> Email History
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent shadow-[0_-2px_10px_rgba(var(--color-accent),0.5)]"></div>
          )}
        </button>
      </div>

      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Column: Recipients & Editor */}
          <div className="xl:col-span-7 space-y-6">
            
            {/* Recipient Selection Card */}
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                  <Users className="text-accent" size={20} />
                  Select Recipients
                </h2>
                <div className="bg-slate-800 text-xs px-3 py-1 rounded-full text-slate-300 font-medium">
                  {selectedStudentIds.length} Selected
                </div>
              </div>
              
              <div className="relative mb-4 group">
                <Search className="absolute left-3.5 top-3 text-slate-500 group-focus-within:text-accent transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all text-sm"
                />
              </div>

              <div className="h-64 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/30 custom-scrollbar">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex items-center gap-4 animate-pulse">
                        <div className="w-4 h-4 bg-slate-800 rounded"></div>
                        <div className="w-8 h-8 bg-slate-800 rounded-full"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-3 bg-slate-800 rounded w-1/3"></div>
                          <div className="h-2 bg-slate-800 rounded w-1/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : hasError ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
                    <AlertTriangle className="w-10 h-10 text-red-400 mb-3 opacity-80" />
                    <p className="text-sm text-center mb-4">Failed to connect to the student database.</p>
                    <button 
                      onClick={fetchStudents}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors text-white"
                    >
                      <RefreshCw size={14} /> Retry Loading
                    </button>
                  </div>
                ) : students.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6">
                    <Users className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm">No students found in the database.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-slate-900 text-slate-400 sticky top-0 z-10 shadow-sm border-b border-slate-800">
                      <tr>
                        <th className="p-4 w-12 text-center">
                          <input 
                            type="checkbox" 
                            onChange={handleSelectAll}
                            checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                            className="rounded bg-slate-950 border-slate-700 text-accent focus:ring-accent focus:ring-offset-slate-900 cursor-pointer"
                          />
                        </th>
                        <th className="p-4 font-medium tracking-wider">Student Name</th>
                        <th className="p-4 font-medium tracking-wider">Email Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredStudents.map(student => (
                        <tr key={student._id} className={`transition-colors hover:bg-slate-800/40 ${selectedStudentIds.includes(student._id) ? 'bg-slate-800/20' : ''}`}>
                          <td className="p-4 text-center">
                            <input 
                              type="checkbox" 
                              checked={selectedStudentIds.includes(student._id)}
                              onChange={() => handleSelectStudent(student._id)}
                              className="rounded bg-slate-950 border-slate-700 text-accent focus:ring-accent focus:ring-offset-slate-900 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 font-medium text-slate-200">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-700">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              {student.name}
                            </div>
                          </td>
                          <td className="p-4 text-slate-400 font-mono text-xs">{student.email}</td>
                        </tr>
                      ))}
                      {filteredStudents.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-slate-500 text-sm">
                            No students match your search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Composer Card */}
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-white border-b border-slate-800 pb-4">
                <FileText className="text-accent" size={20} />
                Compose Message
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Email Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all text-sm"
                    placeholder="Enter an engaging email subject..."
                  />
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1.5 ml-1">
                    <label className="block text-sm font-medium text-slate-300">Message Content (HTML)</label>
                    <span className="text-xs text-slate-500">Variables: <code className="bg-slate-800 px-1 py-0.5 rounded text-[10px] text-accent font-mono">{'{'}{'{'}studentName{'}'}{'}'}</code> <code className="bg-slate-800 px-1 py-0.5 rounded text-[10px] text-accent font-mono">{'{'}{'{'}studentEmail{'}'}{'}'}</code></span>
                  </div>
                  <textarea
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-300 placeholder-slate-700 focus:border-accent focus:ring-1 focus:ring-accent outline-none font-mono text-sm leading-relaxed custom-scrollbar resize-y min-h-[200px]"
                    placeholder="<h1>Hello {{studentName}},</h1>&#10;<p>Welcome to our latest session...</p>"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end pt-5">
                <button
                  disabled={isSending || selectedStudentIds.length === 0 || !subject.trim() || !htmlContent.trim()}
                  onClick={handleSend}
                  className="px-8 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl flex items-center gap-2.5 transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      Sending to {selectedStudentIds.length}...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Send Email ({selectedStudentIds.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="xl:col-span-5 h-[800px] sticky top-8">
            <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden h-full border border-slate-200">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">Live Preview</h2>
              </div>
              
              <div className="p-4 border-b border-slate-100 bg-white">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center text-sm">
                    <span className="text-slate-400 w-16">To:</span>
                    <span className="text-slate-800 font-medium">Student Name &lt;student@example.com&gt;</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-slate-400 w-16">Subject:</span>
                    <span className="text-slate-900 font-bold">{subject || <span className="text-slate-300 font-normal italic">No subject entered...</span>}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-8 overflow-y-auto bg-white text-slate-800 prose prose-sm max-w-none custom-scrollbar">
                {htmlContent ? (
                  <div dangerouslySetInnerHTML={{ 
                    __html: htmlContent
                      .replace(/{{studentName}}/g, 'John Doe')
                      .replace(/{{studentEmail}}/g, 'john@example.com') 
                  }} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                    <Mail className="w-16 h-16 opacity-20" />
                    <p className="text-center">Start typing in the HTML editor<br/>to preview your email layout.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl">
           <div className="flex items-center justify-between mb-6">
             <h2 className="text-lg font-semibold text-white flex items-center gap-2">
               <Clock className="text-accent" size={20} />
               Campaign History
             </h2>
             <button onClick={fetchCampaigns} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
               <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
             </button>
           </div>
           
           <div className="border border-slate-800 rounded-xl overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium tracking-wide">
                   <tr>
                     <th className="p-4">Subject</th>
                     <th className="p-4">Template</th>
                     <th className="p-4">Delivery Stats</th>
                     <th className="p-4">Status</th>
                     <th className="p-4 text-right">Sent Date</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/50">
                   {isLoading && campaigns.length === 0 ? (
                     <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading history...</td></tr>
                   ) : campaigns.filter(c => c.status !== 'draft').map(campaign => (
                     <tr key={campaign._id} className="hover:bg-slate-800/30 transition-colors">
                       <td className="p-4 font-medium text-slate-200">{campaign.subject}</td>
                       <td className="p-4">
                         <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[10px] uppercase tracking-wider font-semibold">
                           {campaign.templateType.replace(/_/g, ' ')}
                         </span>
                       </td>
                       <td className="p-4">
                         <div className="flex items-center gap-3 text-xs">
                           <div className="flex items-center gap-1.5 text-slate-400" title="Total Recipients">
                             <Users size={14} /> {campaign.recipientCount}
                           </div>
                           <div className="flex items-center gap-1.5 text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full" title="Delivered successfully">
                             <CheckCircle size={12} /> {campaign.sentCount}
                           </div>
                           {campaign.failedCount > 0 && (
                             <div className="flex items-center gap-1.5 text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full" title="Failed deliveries">
                               <XCircle size={12} /> {campaign.failedCount}
                             </div>
                           )}
                         </div>
                       </td>
                       <td className="p-4">
                         <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium ${
                           campaign.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                           campaign.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                           'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                         }`}>
                           <span className={`w-1.5 h-1.5 rounded-full ${
                             campaign.status === 'completed' ? 'bg-green-400' :
                             campaign.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'
                           }`}></span>
                           {campaign.status.toUpperCase()}
                         </span>
                       </td>
                       <td className="p-4 text-slate-400 text-right text-xs font-mono">
                         {new Date(campaign.createdAt).toLocaleString(undefined, { 
                           year: 'numeric', month: 'short', day: 'numeric', 
                           hour: '2-digit', minute: '2-digit' 
                         })}
                       </td>
                     </tr>
                   ))}
                   {campaigns.filter(c => c.status !== 'draft').length === 0 && !isLoading && (
                     <tr>
                       <td colSpan={5} className="p-12 text-center text-slate-500">
                         <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                         <p>No email campaigns sent yet.</p>
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmailManagement;
