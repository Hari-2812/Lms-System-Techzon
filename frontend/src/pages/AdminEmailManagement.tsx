import React, { useState, useEffect } from 'react';
import { Mail, Users, Send, FileText, CheckCircle, XCircle, Search, Clock, Save, RefreshCw } from 'lucide-react';
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
    try {
      const res = await api.get('/admin/students');
      if (res.data.success) {
        setStudents(res.data.data);
      }
    } catch (error: any) {
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
        setCampaigns(res.data.data);
      }
    } catch (error: any) {
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudentIds(students.map(s => s._id));
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto text-slate-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-poppins flex items-center gap-3">
            <Mail className="text-accent" />
            Email Management
          </h1>
          <p className="text-slate-400 mt-1">Send important updates and announcements directly to your students.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('compose')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeTab === 'compose' ? 'bg-accent text-white' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          <Send size={18} /> Compose
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeTab === 'history' ? 'bg-accent text-white' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          <Clock size={18} /> History
        </button>
      </div>

      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Recipients & Editor */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Users className="text-accent" size={20} />
                Select Recipients ({selectedStudentIds.length} selected)
              </h2>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-accent outline-none"
                />
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-800 rounded-lg">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="text-xs uppercase bg-slate-800 text-slate-400 sticky top-0">
                    <tr>
                      <th className="p-3">
                        <input 
                          type="checkbox" 
                          onChange={handleSelectAll}
                          checked={students.length > 0 && selectedStudentIds.length === students.length}
                          className="rounded bg-slate-700 border-slate-600 text-accent focus:ring-accent"
                        />
                      </th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase())).map(student => (
                      <tr key={student._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="p-3">
                          <input 
                            type="checkbox" 
                            checked={selectedStudentIds.includes(student._id)}
                            onChange={() => handleSelectStudent(student._id)}
                            className="rounded bg-slate-700 border-slate-600 text-accent focus:ring-accent"
                          />
                        </td>
                        <td className="p-3">{student.name}</td>
                        <td className="p-3 text-slate-400">{student.email}</td>
                      </tr>
                    ))}
                    {students.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-slate-500">No students found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="text-accent" size={20} />
                Compose Email
              </h2>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-accent outline-none"
                  placeholder="Enter email subject"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">HTML Content</label>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-accent outline-none font-mono text-sm"
                  placeholder="<p>Hello {{studentName}},</p>"
                ></textarea>
                <p className="text-xs text-slate-500 mt-2">Available variables: {'{{studentName}}'}, {'{{studentEmail}}'}</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  disabled={isSending}
                  onClick={handleSend}
                  className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                >
                  {isSending ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                  Send Email
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg flex flex-col overflow-hidden h-[800px]">
            <div className="p-4 border-b border-slate-800 bg-slate-800/50">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Live Preview</h2>
            </div>
            <div className="flex-1 p-6 overflow-y-auto bg-white text-slate-900">
              <div dangerouslySetInnerHTML={{ 
                __html: htmlContent
                  ? htmlContent.replace(/{{studentName}}/g, 'John Doe').replace(/{{studentEmail}}/g, 'john@example.com') 
                  : '<p style="color: #888;">Start typing to preview your email...</p>'
              }} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
         <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
           <h2 className="text-lg font-semibold mb-4">Email History</h2>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-800 text-slate-400">
                 <tr>
                   <th className="p-3 rounded-tl-lg">Subject</th>
                   <th className="p-3">Template</th>
                   <th className="p-3">Recipients</th>
                   <th className="p-3">Status</th>
                   <th className="p-3 rounded-tr-lg">Date</th>
                 </tr>
               </thead>
               <tbody>
                 {campaigns.filter(c => c.status !== 'draft').map(campaign => (
                   <tr key={campaign._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                     <td className="p-3 font-medium">{campaign.subject}</td>
                     <td className="p-3 text-slate-400 uppercase text-xs">{campaign.templateType.replace(/_/g, ' ')}</td>
                     <td className="p-3">
                       <div className="flex items-center gap-2 text-xs">
                         <span className="text-slate-300">{campaign.recipientCount} Total</span>
                         <span className="text-green-400 flex items-center"><CheckCircle size={12} className="mr-1"/> {campaign.sentCount}</span>
                         {campaign.failedCount > 0 && <span className="text-red-400 flex items-center"><XCircle size={12} className="mr-1"/> {campaign.failedCount}</span>}
                       </div>
                     </td>
                     <td className="p-3">
                       <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                         campaign.status === 'completed' ? 'bg-green-900/30 text-green-400 border border-green-800/50' :
                         campaign.status === 'failed' ? 'bg-red-900/30 text-red-400 border border-red-800/50' :
                         'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50'
                       }`}>
                         {campaign.status.toUpperCase()}
                       </span>
                     </td>
                     <td className="p-3 text-slate-400">{new Date(campaign.createdAt).toLocaleString()}</td>
                   </tr>
                 ))}
                 {campaigns.filter(c => c.status !== 'draft').length === 0 && !isLoading && (
                   <tr><td colSpan={5} className="p-8 text-center text-slate-500">No campaigns sent yet.</td></tr>
                 )}
               </tbody>
             </table>
           </div>
         </div>
      )}
    </div>
  );
};

export default AdminEmailManagement;
