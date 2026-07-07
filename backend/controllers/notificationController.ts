import {
 Request,
 Response
} from "express";
import * as notificationService from '../services/notificationService';
import logger from '../config/logger';

export const getMyNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    const list = await notificationService.getUserNotifications(userId, role as any);
    res.status(200).json({ success: true, data: list });
  } catch (error: any) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(id);
    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }
    res.status(200).json({ success: true, data: notification });
  } catch (error: any) {
    logger.error('Error marking notification read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    const count = await notificationService.markAllAsRead(userId, role as any);
    res.status(200).json({ success: true, message: `${count} notifications marked as read` });
  } catch (error: any) {
    logger.error('Error marking all notifications read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await notificationService.deleteNotification(id);
    if (!success) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Notification deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
