import React, { useState, useEffect } from 'react';
import { Search, Trash2, Check, Inbox, Mail, UserCheck, UserX, AlertTriangle, Info, Calendar, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { NotificationItem } from '../components/NotificationBell';

const AdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      const res = await api.put(`/notifications/${id}/read`);
      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        toast.success('Notification marked as read');
      }
    } catch (error) {
      console.error('Failed to mark read:', error);
      toast.error('Failed to mark read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await api.put('/notifications/read-all');
      if (res.data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Failed to mark all read:', error);
      toast.error('Failed to mark all read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/notifications/${id}`);
      if (res.data.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        toast.success('Notification deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ONBOARDING_CREATED':
      case 'NEW_ONBOARDING':
        return <Inbox className="w-5 h-5 text-accent" />;
      case 'STUDENT_APPROVED':
        return <UserCheck className="w-5 h-5 text-green-500" />;
      case 'STUDENT_REJECTED':
        return <UserX className="w-5 h-5 text-red-500" />;
      case 'EMAIL_SENT':
        return <Mail className="w-5 h-5 text-blue-400" />;
      case 'EMAIL_FAILED':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-slate-400" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === 'ALL') return matchesSearch;
    if (filterType === 'ONBOARDING') return (n.type === 'ONBOARDING_CREATED' || n.type === 'NEW_ONBOARDING' || n.type === 'NEW_STUDENT_ONBOARDING') && matchesSearch;
    if (filterType === 'APPROVAL') return n.type === 'STUDENT_APPROVED' && matchesSearch;
    if (filterType === 'REJECTION') return n.type === 'STUDENT_REJECTED' && matchesSearch;
    if (filterType === 'EMAILS') return (n.type === 'EMAIL_SENT' || n.type === 'EMAIL_FAILED') && matchesSearch;

    return matchesSearch;
  });

  return (
    <div className="container mx-auto max-w-6xl font-poppins text-slate-800 dark:text-slate-100">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            System Notifications
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage real-time notifications for student onboardings, approvals, and email status.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchNotifications}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition duration-200 border border-slate-250 dark:border-slate-750"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={notifications.filter((n) => !n.isRead).length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-accent text-white hover:bg-accent-dark transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-accent/15"
          >
            <Check className="w-4 h-4" /> Mark All Read
          </button>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full lg:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search notifications by title or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-250 dark:bg-slate-800/40 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition duration-200"
            />
          </div>

          {/* Filtering buttons */}
          <div className="flex flex-wrap gap-1.5 justify-center w-full lg:w-auto">
            {[
              { label: 'All Logs', value: 'ALL' },
              { label: 'Registrations', value: 'ONBOARDING' },
              { label: 'Approvals', value: 'APPROVAL' },
              { label: 'Rejections', value: 'REJECTION' },
              { label: 'Emails', value: 'EMAILS' },
            ].map((btn) => (
              <button
                key={btn.value}
                onClick={() => setFilterType(btn.value)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                  filterType === btn.value
                    ? 'bg-secondary-light text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-4 font-medium">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300">No Notifications Found</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mt-1.5 leading-relaxed">
              We couldn't find any notifications matching your filters or search criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredNotifications.map((n) => (
              <div
                key={n._id}
                className={`p-5 flex gap-4 transition duration-150 relative group ${
                  !n.isRead ? 'bg-indigo-50/15 dark:bg-indigo-950/5' : ''
                }`}
              >
                {/* Icon wrapper */}
                <div className="flex-shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-150 dark:border-slate-750">
                    {getNotificationIcon(n.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-12">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-5">
                      {n.title}
                    </h3>
                    {!n.isRead && (
                      <span className="bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-655 dark:text-slate-350 mt-1.5 leading-relaxed">
                    {n.message}
                  </p>
                  
                  {/* Timestamp */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 mt-3">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="absolute right-5 top-5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-150">
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n._id)}
                      className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-500 hover:text-green-500 border border-slate-200 dark:border-slate-700 shadow-sm transition duration-200"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n._id)}
                    className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-500 hover:text-red-500 border border-slate-200 dark:border-slate-700 shadow-sm transition duration-200"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Unread indicator */}
                {!n.isRead && (
                  <span className="absolute right-6 top-6 w-2.5 h-2.5 rounded-full bg-accent group-hover:hidden" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;
