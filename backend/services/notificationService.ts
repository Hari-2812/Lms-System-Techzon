import Notification, { INotification } from '../models/Notification';
import { getIO } from './socketService';
import logger from '../config/logger';
import mongoose from 'mongoose';

export const sendRealtimeNotification = (notification: INotification): void => {
  try {
    const io = getIO();
    console.log(`[BACKEND] Preparing to emit notification: "${notification.title}" (Type: ${notification.type})`);
    
    // Determine target rooms
    const recipientIdStr = notification.recipientId?.toString();
    
    if (recipientIdStr) {
      const userRoom = `user:${recipientIdStr}`;
      logger.info(`Emitting real-time notification to user room ${userRoom}: ${notification.title}`);
      console.log(`[BACKEND] Emitting to user room: ${userRoom}`);
      io.to(userRoom).emit('notification:new', notification);
    } else {
      // Role based broadcast or type based
      const roles = notification.recipientRole || [];
      const isForAdmins = roles.includes('Admin') || roles.includes('SuperAdmin');

      if (isForAdmins || notification.type === 'NEW_STUDENT_ONBOARDING') {
        console.log(`[BACKEND] Emitting to 'admins' room for admin notification.`);
        
        // Emit the standard MongoDB document for Bell Count & dropdown persistence
        io.to('admins').emit('notification:new', notification);
        
        // Task 5 Event requirement: Emit specific data object
        if (notification.type === 'NEW_STUDENT_ONBOARDING') {
          console.log(`[BACKEND] Socket event 'notification:new' (Task 5 custom payload) emitted to admins.`);
          io.to('admins').emit('notification:new', {
            title: notification.title,
            message: notification.message,
            data: {
              name: notification.metadata?.studentName || '',
              email: notification.metadata?.email || '',
              course: notification.metadata?.course || '',
              googleRowId: notification.metadata?.googleRowId || ''
            }
          });
          
          io.to('admins').emit('onboarding:new', notification);
        } else if (notification.type === 'ONBOARDING_CREATED' || notification.type === 'NEW_ONBOARDING') {
          io.to('admins').emit('onboarding:new', notification);
        } else if (notification.type === 'STUDENT_APPROVED') {
          io.to('admins').emit('student:approved', notification);
        } else if (notification.type === 'STUDENT_REJECTED') {
          io.to('admins').emit('student:rejected', notification);
        }
      } else {
        // Broadcast to specific roles in the array
        roles.forEach((role) => {
          const roleRoom = `role:${role}`;
          console.log(`[BACKEND] Emitting to role room: ${roleRoom}`);
          io.to(roleRoom).emit('notification:new', notification);
          
          if (notification.type === 'ONBOARDING_CREATED' || notification.type === 'NEW_ONBOARDING') {
            io.to(roleRoom).emit('onboarding:new', notification);
          } else if (notification.type === 'STUDENT_APPROVED') {
            io.to(roleRoom).emit('student:approved', notification);
          } else if (notification.type === 'STUDENT_REJECTED') {
            io.to(roleRoom).emit('student:rejected', notification);
          }
        });
      }
    }
  } catch (error) {
    logger.error('Failed to emit real-time notification via Socket.IO:', error);
    console.error('[BACKEND] Failed to emit socket event:', error);
  }
};

export const createNotification = async (data: {
  title: string;
  message: string;
  type: 'ONBOARDING_CREATED' | 'NEW_ONBOARDING' | 'NEW_STUDENT_ONBOARDING' | 'STUDENT_APPROVED' | 'STUDENT_REJECTED' | 'EMAIL_SENT' | 'EMAIL_FAILED';
  recipientRole: ('SuperAdmin' | 'Admin' | 'Mentor' | 'Student')[];
  recipientId?: string | mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
}): Promise<INotification> => {
  console.log(`[BACKEND] Creating admin notification in database: "${data.title}"`);
  const notification = new Notification({
    title: data.title,
    message: data.message,
    type: data.type,
    recipientRole: data.recipientRole,
    recipientId: data.recipientId,
    metadata: data.metadata || {},
  });

  await notification.save();
  console.log(`[BACKEND] Notification saved in MongoDB with ID: ${notification._id}`);
  sendRealtimeNotification(notification);
  return notification;
};

export const markAsRead = async (id: string): Promise<INotification | null> => {
  const notification = await Notification.findById(id);
  if (!notification) return null;
  
  notification.isRead = true;
  await notification.save();
  return notification;
};

export const markAllAsRead = async (userId: string, role: 'SuperAdmin' | 'Admin' | 'Mentor' | 'Student'): Promise<number> => {
  const rolesToCheck = role === 'SuperAdmin' || role === 'Admin' ? ['Admin', 'SuperAdmin'] : [role];
  
  const result = await Notification.updateMany(
    {
      $or: [
        { recipientId: userId },
        { recipientRole: { $in: rolesToCheck }, recipientId: { $exists: false } },
        { recipientRole: { $in: rolesToCheck }, recipientId: null }
      ],
      isRead: false
    },
    { $set: { isRead: true } }
  );
  return result.modifiedCount;
};

export const getUserNotifications = async (userId: string, role: 'SuperAdmin' | 'Admin' | 'Mentor' | 'Student'): Promise<INotification[]> => {
  const rolesToCheck = role === 'SuperAdmin' || role === 'Admin' ? ['Admin', 'SuperAdmin'] : [role];
  
  return Notification.find({
    $or: [
      { recipientId: userId },
      { recipientRole: { $in: rolesToCheck }, recipientId: { $exists: false } },
      { recipientRole: { $in: rolesToCheck }, recipientId: null }
    ]
  }).sort({ createdAt: -1 });
};

export const deleteNotification = async (id: string): Promise<boolean> => {
  const result = await Notification.findByIdAndDelete(id);
  return !!result;
};
