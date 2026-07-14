import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, ChevronRight, Inbox, Mail, UserCheck, UserX, AlertTriangle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import type { RootState } from '../redux/store';
import api from '../services/api';
import { getSocket, connectSocket } from '../services/socket';

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: 'ONBOARDING_CREATED' | 'NEW_ONBOARDING' | 'STUDENT_APPROVED' | 'STUDENT_REJECTED' | 'EMAIL_SENT' | 'EMAIL_FAILED';
  recipientRole: 'SuperAdmin' | 'Admin' | 'Mentor' | 'Student';
  recipientId?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const NotificationBell: React.FC = () => {
  const { user, isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.data.filter((n: NotificationItem) => !n.isRead).length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchNotifications();
      connectSocket();
      const socket = getSocket();

      const handleNewNotification = (notification: any) => {

        
        // Handle custom data payload (Task 5 requirement) which lacks _id
        if (!notification._id) {
          toast(
            (t) => {
              const name = notification.data?.fullName || notification.data?.name || 'New Student';
              const course = notification.data?.course || 'Full Stack Development';
              return (
                <div 
                  className="flex flex-col gap-2 p-1 font-poppins text-left"
                  onClick={() => {
                    toast.dismiss(t.id);
                    navigate('/admin/onboarding');
                  }}
                >
                  <div className="border-b border-white/10 pb-1 font-bold text-sm tracking-wide text-white flex items-center gap-2">
                    🎓 New Student Registration
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    <span className="font-semibold text-white">{name}</span> submitted onboarding.
                  </div>
                  <div className="text-[11px] text-slate-400 bg-black/30 p-1.5 rounded border border-white/5">
                    <span className="font-semibold text-slate-300">Course:</span> {course}
                  </div>
                  <div className="mt-1 flex justify-end">
                    <button className="text-[10px] font-bold bg-[#F57C20] hover:bg-[#e06b12] text-white px-3 py-1.5 rounded-lg shadow transition">
                      Review Student
                    </button>
                  </div>
                </div>
              );
            },
            {
              duration: 8000,
              position: 'top-right',
              style: {
                background: '#241252',
                color: '#fff',
                border: '1px solid #31206B',
                borderRadius: '16px',
                padding: '16px',
                width: '320px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
              },
            }
          );
          return;
        }

        // Standard notification handling with _id
        setNotifications((prev) => {
          if (prev.some((n) => n._id === notification._id)) return prev;
          return [notification, ...prev];
        });
        setUnreadCount((c) => c + 1);

        // If it's NEW_STUDENT_ONBOARDING, we already toasted the custom payload above
        if (notification.type === 'NEW_STUDENT_ONBOARDING') {
          return;
        }

        // Display toast popup for other types
        let icon = '🔔';
        if (notification.type === 'ONBOARDING_CREATED' || notification.type === 'NEW_ONBOARDING') icon = '🎓';
        else if (notification.type === 'STUDENT_APPROVED') icon = '✅';
        else if (notification.type === 'STUDENT_REJECTED') icon = '❌';
        else if (notification.type === 'EMAIL_SENT') icon = '📧';
        else if (notification.type === 'EMAIL_FAILED') icon = '⚠️';

        toast(
          (t) => (
            <div className="flex flex-col gap-1 cursor-pointer" onClick={() => {
              toast.dismiss(t.id);
              if (['Admin', 'SuperAdmin'].includes(user?.role || '')) {
                if (notification.type === 'ONBOARDING_CREATED' || notification.type === 'NEW_ONBOARDING') {
                  navigate('/admin/onboarding');
                } else {
                  navigate('/admin/notifications');
                }
              }
            }}>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {icon} {notification.title}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300">{notification.message}</span>
            </div>
          ),
          {
            duration: 6000,
            position: 'top-right',
            style: {
              background: '#241252',
              color: '#fff',
              border: '1px solid #31206B',
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            },
          }
        );
      };

      socket.on('notification:new', handleNewNotification);

      return () => {
        socket.off('notification:new', handleNewNotification);
      };
    }
  }, [isAuthenticated, token, user, navigate]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.put(`/notifications/${id}/read`);
      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (error) {
      console.error('Failed to mark read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await api.put('/notifications/read-all');
      if (res.data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Failed to mark all read:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.delete(`/notifications/${id}`);
      if (res.data.success) {
        const deleted = notifications.find((n) => n._id === id);
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        if (deleted && !deleted.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        toast.success('Notification deleted');
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-200"
        title="Notifications"
        id="notification-bell-btn"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-accent text-white text-[10px] font-bold font-poppins rounded-full w-5 h-5 flex items-center justify-center animate-pulse border-2 border-white dark:border-bg-dark">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
            <h3 className="font-poppins font-bold text-slate-800 dark:text-white text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-accent hover:text-accent-dark font-medium transition duration-200 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Bell className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">All caught up!</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">No new notifications here.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => {
                    if (['Admin', 'SuperAdmin'].includes(user?.role || '')) {
                      if (n.type === 'ONBOARDING_CREATED' || n.type === 'NEW_ONBOARDING' || n.type === 'NEW_STUDENT_ONBOARDING') {
                        navigate('/admin/onboarding');
                      } else {
                        navigate('/admin/notifications');
                      }
                      setIsOpen(false);
                    }
                  }}
                  className={`flex gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition duration-150 relative group ${
                    !n.isRead ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      {getNotificationIcon(n.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white leading-5 truncate">
                      {n.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-4 mt-1 font-poppins">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-2 font-poppins">
                      {formatTimeAgo(n.createdAt)}
                    </span>
                  </div>

                  {/* Badges/Read Dot & Actions */}
                  <div className="absolute right-4 top-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
                    {!n.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(n._id, e)}
                        className="p-1 rounded-md bg-white dark:bg-slate-800 text-slate-400 hover:text-green-500 border border-slate-200 dark:border-slate-700 shadow-sm"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(n._id, e)}
                      className="p-1 rounded-md bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 border border-slate-200 dark:border-slate-700 shadow-sm"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!n.isRead && (
                    <span className="absolute right-4 top-4 w-2 h-2 rounded-full bg-accent group-hover:hidden" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer View All */}
          {['Admin', 'SuperAdmin'].includes(user?.role || '') && (
            <div className="border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  navigate('/admin/notifications');
                  setIsOpen(false);
                }}
                className="w-full text-center py-3.5 text-xs font-poppins font-semibold text-accent hover:text-accent-dark hover:bg-slate-50 dark:hover:bg-slate-950/20 transition duration-200 flex items-center justify-center gap-1"
              >
                View all notifications <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
