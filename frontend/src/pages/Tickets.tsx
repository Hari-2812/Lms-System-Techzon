import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { LifeBuoy, Send, Loader2, MessageSquare, Plus, Clock, User } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import { PageHeader, Card, Button, Badge, EmptyState, Input, LoadingState } from '../components/ui';

interface TicketMessage {
  senderId: string;
  message: string;
  createdAt: string;
}

interface Ticket {
  _id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  messages: TicketMessage[];
  createdAt: string;
  studentId?: {
    name: string;
    email: string;
  };
}

const Tickets: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  // New ticket state
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('low');
  const [showCreate, setShowCreate] = useState(false);

  // Message reply state
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/tickets');
      setTickets(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/tickets', {
        subject,
        description,
        category,
        priority,
      });
      alert('Support ticket created successfully!');
      setSubject('');
      setDescription('');
      setShowCreate(false);
      fetchTickets();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error creating ticket');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage || !selectedTicket) return;
    setSendingReply(true);

    try {
      const res = await api.post(`/tickets/${selectedTicket._id}/messages`, {
        message: replyMessage,
      });
      setSelectedTicket(res.data.data);
      setReplyMessage('');
      fetchTickets();
    } catch (error) {
      console.error(error);
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      const res = await api.put(`/tickets/${ticketId}/status`, { status });
      setSelectedTicket(res.data.data);
      fetchTickets();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <LoadingState message="Loading support tickets..." />;
  }

  return (
    <div className="space-y-8 font-poppins pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Helpdesk Support Tickets"
          subtitle="Ask questions, file billing reports, or query lecture doubt clears."
        />
        
        {user?.role === 'student' && (
          <Button
            variant="accent"
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Ticket
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Create ticket or Tickets list */}
        <div className="lg:col-span-1 space-y-6">
          {showCreate && user?.role === 'student' ? (
            <Card className="p-6 space-y-5">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">File New Ticket</h3>
              <form onSubmit={handleCreateTicket} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-slate-500">Subject / Topic</label>
                  <Input
                    type="text"
                    required
                    placeholder="MERN Module 2 doubt clearance"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent"
                    >
                      <option value="general">General</option>
                      <option value="technical">Technical</option>
                      <option value="billing">Billing</option>
                      <option value="course">Course Doubt</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Description</label>
                  <textarea
                    required
                    placeholder="Provide details about your query..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs h-24 outline-none focus:border-accent resize-none transition"
                  />
                </div>

                <Button type="submit" variant="accent" className="w-full justify-center">
                  Submit Support Ticket
                </Button>
              </form>
            </Card>
          ) : (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Active Conversations</h3>
              
              {tickets.length === 0 ? (
                <EmptyState
                  icon={LifeBuoy}
                  title="No active tickets"
                  description="You don't have any open support tickets at the moment."
                />
              ) : (
                tickets.map((t) => {
                  const isSelected = selectedTicket?._id === t._id;
                  return (
                    <button
                      key={t._id}
                      onClick={() => setSelectedTicket(t)}
                      className={`w-full text-left p-4 rounded-xl border flex flex-col justify-between gap-3 transition ${
                        isSelected
                          ? 'border-accent bg-accent/5 dark:bg-accent/5 text-slate-800'
                          : 'border-slate-100 hover:bg-slate-50 dark:border-border-dark dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="w-full">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-xs line-clamp-1 leading-4 text-slate-800 dark:text-white">{t.subject}</h4>
                          <Badge variant={
                            t.status === 'open' ? 'warning' :
                            t.status === 'in-progress' ? 'primary' : 'success'
                          }>
                            {t.status}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">Ref ID: {t._id.slice(-6).toUpperCase()}</p>
                      </div>

                      <div className="w-full flex justify-between items-center text-[10px] text-slate-400 font-semibold border-t border-slate-100/50 pt-2">
                        <span>{t.messages.length} Messages</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Side: Conversation window thread details */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <Card className="flex flex-col h-[65vh] overflow-hidden p-0">
              {/* Top Banner details */}
              <div className="p-5 border-b border-slate-100 dark:border-border-dark flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-card-dark/20">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">{selectedTicket.subject}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Priority: <span className="uppercase font-bold text-accent">{selectedTicket.priority}</span> | Category: {selectedTicket.category}</p>
                </div>
                
                {['admin', 'super-admin', 'support'].includes(user?.role || '') && selectedTicket.status !== 'closed' && (
                  <Button
                    variant="danger"
                    onClick={() => handleUpdateStatus(selectedTicket._id, 'closed')}
                    className="text-xs py-1.5 px-3"
                  >
                    Close Ticket
                  </Button>
                )}
              </div>

              {/* Message history list */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/20">
                {selectedTicket.messages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.id || msg.senderId === (user as any)?._id;
                  return (
                    <div
                      key={idx}
                      className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-border-dark flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 flex-shrink-0 text-xs">
                        {isMe ? 'ME' : 'SUP'}
                      </div>
                      <div className={`p-4 rounded-2xl text-xs space-y-1.5 ${
                        isMe
                          ? 'bg-primary text-white rounded-tr-none'
                          : 'bg-white dark:bg-card-dark border border-slate-100 dark:border-border-dark text-slate-700 dark:text-slate-300 rounded-tl-none'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-line">{msg.message}</p>
                        <span className={`block text-[9px] font-semibold text-right ${isMe ? 'text-slate-300' : 'text-slate-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message inputs bottom */}
              {selectedTicket.status !== 'closed' ? (
                <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 dark:border-border-dark flex gap-3 bg-white dark:bg-card-dark">
                  <Input
                    type="text"
                    required
                    placeholder="Type your response message..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    variant="accent"
                    disabled={sendingReply}
                    className="px-4 flex items-center justify-center gap-1.5"
                  >
                    {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              ) : (
                <div className="p-4 border-t border-slate-100 dark:border-border-dark text-center text-xs font-semibold text-slate-400 bg-slate-50/20">
                  This conversation has been resolved and closed.
                </div>
              )}
            </Card>
          ) : (
            <Card className="h-[65vh] flex flex-col items-center justify-center text-center p-6 space-y-3">
              <MessageSquare className="w-12 h-12 text-slate-300 animate-float" />
              <h4 className="text-slate-600 dark:text-slate-400 font-bold">Select a Support Ticket</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">Choose an active message thread from the left list to review feedback from mentors and technicians.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tickets;
