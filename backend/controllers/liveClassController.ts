import { Request, Response } from 'express';
import mongoose from 'mongoose';
import LiveClass from '../models/LiveClass';
import AuditLog from '../models/AuditLog';
import Enrollment from '../models/Enrollment';
import Notification from '../models/Notification';
import { getIO } from '../services/socketService';
import Course from '../models/Course';
import { sendLiveClassNotificationEmail } from '../services/email';

export const getLiveClasses = async (req: any, res: Response): Promise<void> => {
  try {
    let classes;
    if (['SuperAdmin', 'Admin', 'Mentor', 'Support'].includes(req.user.role)) {
      const { courseId } = req.query;
      const filter = courseId ? { courseId } : {};
      classes = await LiveClass.find(filter)
        .populate('courseId', 'title')
        .populate('mentorId', 'name email')
        .sort({ scheduledTime: -1 });

      // Add registered students count to each class
      const classesWithCount = await Promise.all(classes.map(async (cls) => {
        let studentCount = 0;
        if (cls.studentIds && cls.studentIds.length > 0) {
          studentCount = cls.studentIds.length;
        } else {
          studentCount = await Enrollment.countDocuments({ courseId: cls.courseId, status: 'active' });
        }
        return { ...cls.toObject(), registeredStudents: studentCount };
      }));
      res.status(200).json({ success: true, data: classesWithCount });
      return;
    } else {
      // Students only see live classes scheduled for their actively enrolled courses
      // AND where they are explicitly in studentIds (or studentIds is empty for legacy)
      const enrollments = await Enrollment.find({ studentId: req.user._id, status: { $in: ['active', 'completed'] } }).select('courseId');
      const courseIds = enrollments.map(e => e.courseId);

      classes = await LiveClass.find({ 
        courseId: { $in: courseIds },
        $or: [
          { studentIds: { $exists: false } },
          { studentIds: { $size: 0 } },
          { studentIds: req.user._id }
        ]
      })
        .populate('courseId', 'title')
        .populate('mentorId', 'name email')
        .sort({ scheduledTime: 1 });
      res.status(200).json({ success: true, data: classes });
      return;
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getCourseStudents = async (req: any, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const enrollments = await Enrollment.find({ courseId, status: { $in: ['active', 'completed'] } })
      .populate('studentId', 'name email status');
      
    const students = enrollments.map(e => e.studentId).filter(s => s != null);
    
    res.status(200).json({ success: true, data: students });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getLiveClassDetails = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const liveClass = await LiveClass.findById(id)
      .populate('courseId', 'title')
      .populate('mentorId', 'name email');
      
    if (!liveClass) {
      res.status(404).json({ success: false, message: 'Class not found' });
      return;
    }

    if (['SuperAdmin', 'Admin', 'Mentor', 'Support'].includes(req.user.role)) {
      // Return details with students list
      const activeEnrollments = await Enrollment.find({ courseId: liveClass.courseId, status: { $in: ['active', 'completed'] } })
        .populate('studentId', 'name email status');
      
      res.status(200).json({ success: true, data: { ...liveClass.toObject(), students: activeEnrollments } });
    } else {
      // Student verification
      const enrollment = await Enrollment.findOne({ studentId: req.user._id, courseId: liveClass.courseId, status: 'active' });
      if (!enrollment) {
        res.status(403).json({ success: false, message: 'Not authorized to view this class' });
        return;
      }
      
      const hasStudentIds = liveClass.studentIds && liveClass.studentIds.length > 0;
      if (hasStudentIds) {
        const isSelected = liveClass.studentIds.some(id => id.toString() === req.user._id.toString());
        if (!isSelected) {
          res.status(403).json({ success: false, message: 'Not authorized to view this class. You were not selected by the Admin.' });
          return;
        }
      }

      res.status(200).json({ success: true, data: liveClass });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createLiveClass = async (req: any, res: Response): Promise<void> => {
  try {
    const liveClass = new LiveClass({
      ...req.body,
      mentorId: req.body.mentorId || req.user._id,
    });
    await liveClass.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'CREATE_LIVE_CLASS',
      details: `Scheduled live class: ${liveClass.title} under course ${liveClass.courseId}`,
    });

    // Filter req.body.studentIds against active enrollments
    const enrollments = await Enrollment.find({ courseId: liveClass.courseId, status: { $in: ['active', 'completed'] } }).populate<{studentId: any}>('studentId');
    const enrolledStudentIds = enrollments.map(e => e.studentId._id.toString());
    
    let studentIdsToNotify: string[] = [];
    if (req.body.studentIds && Array.isArray(req.body.studentIds)) {
      const requestedStudentIds: string[] = (req.body.studentIds as unknown[])
        .filter((id): id is string => typeof id === 'string')
        .map((id: string) => id.trim())
        .filter(Boolean);

      const uniqueIds = [...new Set(requestedStudentIds)];
      studentIdsToNotify = uniqueIds.filter(id => enrolledStudentIds.includes(id));
      
      liveClass.studentIds = studentIdsToNotify.map(id => new mongoose.Types.ObjectId(id));
      await liveClass.save();
    } else {
      // Legacy behavior if not provided
      studentIdsToNotify = enrolledStudentIds;
    }
    
    let notificationsFailed = false;
    
    // Email tracking
    let totalEligible = 0;
    let sentCount = 0;
    let failedCount = 0;
    
    try {
      if (studentIdsToNotify.length > 0) {
        // App notifications
        const notifications = studentIdsToNotify.map(studentId => ({
          title: 'Live Class Scheduled',
          message: `A new live class "${liveClass.title}" has been scheduled for your course.`,
          type: 'LIVE_CLASS_CREATED',
          recipientRole: ['Student'],
          recipientId: studentId,
          metadata: { liveClassId: liveClass._id, courseId: liveClass.courseId }
        }));
        await Notification.insertMany(notifications);

        const io = getIO();
        studentIdsToNotify.forEach(studentId => {
          io.to(`user:${studentId}`).emit('notification:new', {
            title: 'Live Class Scheduled',
            message: `A new live class "${liveClass.title}" has been scheduled.`,
            type: 'LIVE_CLASS_CREATED'
          });
        });
        
        // Email Notifications
        const course = await Course.findById(liveClass.courseId);
        const courseName = course?.title || 'Your Course';
        const d = new Date(liveClass.scheduledTime);
        const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
        
        const formatTime = (date: Date) => {
          return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) + ' IST';
        };
        const startTimeStr = formatTime(d);
        const endD = new Date(d.getTime() + (liveClass.durationMinutes || 0) * 60000);
        const endTimeStr = formatTime(endD);
        
        const eligibleStudents = enrollments.filter(e => 
          studentIdsToNotify.includes(e.studentId._id.toString()) && 
          e.studentId.email
        );
        totalEligible = eligibleStudents.length;

        // Send emails asynchronously, non-blocking
        Promise.all(eligibleStudents.map(async (enrollment) => {
          try {
            await sendLiveClassNotificationEmail(
              enrollment.studentId.email,
              enrollment.studentId.name || 'Student',
              courseName,
              liveClass.title,
              dateStr,
              startTimeStr,
              endTimeStr,
              liveClass.mentorId?.toString() || 'Techzon Mentor', // In a real app we might want to populate mentorId
              liveClass.meetingPlatform || 'Online',
              liveClass.meetingLink || '',
              false // isUpdate
            );
            sentCount++;
          } catch (emailErr) {
            console.error(`Failed to send email to ${enrollment.studentId.email}:`, emailErr);
            failedCount++;
          }
        })).catch(err => console.error('Error processing emails', err));
      }
    } catch (notifErr) {
      console.error('Failed to send notifications for new live class:', notifErr);
      notificationsFailed = true;
    }

    res.status(201).json({ 
      success: true, 
      data: liveClass, 
      emailSummary: { totalEligible, sentCount, failedCount },
      message: notificationsFailed ? 'Live class created successfully. Some app notifications could not be delivered.' : 'Live class created successfully.' 
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateLiveClass = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const liveClassToUpdate = await LiveClass.findById(id);
    if (!liveClassToUpdate) {
      res.status(404).json({ success: false, message: 'Class not found' });
      return;
    }

    // Filter studentIds if provided
    let newStudentIds: string[] | undefined;
    const enrollments = await Enrollment.find({ courseId: liveClassToUpdate.courseId, status: { $in: ['active', 'completed'] } }).populate<{studentId: any}>('studentId');
    if (req.body.studentIds && Array.isArray(req.body.studentIds)) {
      const enrolledStudentIds = enrollments.map(e => e.studentId._id.toString());
      
      const requestedStudentIds: string[] = (req.body.studentIds as unknown[])
        .filter((id): id is string => typeof id === 'string')
        .map((id: string) => id.trim())
        .filter(Boolean);

      const uniqueIds = [...new Set(requestedStudentIds)];
      newStudentIds = uniqueIds.filter(id => enrolledStudentIds.includes(id));
      
      req.body.studentIds = newStudentIds; // Set for update
    }

    const updatedLiveClass = await LiveClass.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );

    await AuditLog.create({
      userId: req.user._id,
      action: 'UPDATE_LIVE_CLASS',
      details: `Updated live class: ${updatedLiveClass?.title}`,
    });

    // Determine who to notify
    const studentIdsToNotify = newStudentIds || (updatedLiveClass?.studentIds?.map(id => id.toString()) || []);
    let notificationsFailed = false;
    let totalEligible = 0;
    let sentCount = 0;
    let failedCount = 0;

    try {
      if (studentIdsToNotify.length > 0 && updatedLiveClass) {
        const notifications = studentIdsToNotify.map(studentId => ({
          title: 'Live Class Updated',
          message: `The live class "${updatedLiveClass.title}" has been updated.`,
          type: 'LIVE_CLASS_UPDATED',
          recipientRole: ['Student'],
          recipientId: studentId,
          metadata: { liveClassId: updatedLiveClass._id, courseId: updatedLiveClass.courseId }
        }));
        await Notification.insertMany(notifications);

        const io = getIO();
        studentIdsToNotify.forEach(studentId => {
          io.to(`user:${studentId}`).emit('notification:new', {
            title: 'Live Class Updated',
            message: `The live class "${updatedLiveClass.title}" has been updated.`,
            type: 'LIVE_CLASS_UPDATED'
          });
        });
        
        // Email Notifications
        const course = await Course.findById(updatedLiveClass.courseId);
        const courseName = course?.title || 'Your Course';
        const d = new Date(updatedLiveClass.scheduledTime);
        const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
        
        const formatTime = (date: Date) => {
          return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) + ' IST';
        };
        const startTimeStr = formatTime(d);
        const endD = new Date(d.getTime() + (updatedLiveClass.durationMinutes || 0) * 60000);
        const endTimeStr = formatTime(endD);
        
        const eligibleStudents = enrollments.filter(e => 
          studentIdsToNotify.includes(e.studentId._id.toString()) && 
          e.studentId.email
        );
        totalEligible = eligibleStudents.length;

        // Send emails asynchronously, non-blocking
        Promise.all(eligibleStudents.map(async (enrollment) => {
          try {
            await sendLiveClassNotificationEmail(
              enrollment.studentId.email,
              enrollment.studentId.name || 'Student',
              courseName,
              updatedLiveClass.title,
              dateStr,
              startTimeStr,
              endTimeStr,
              updatedLiveClass.mentorId?.toString() || 'Techzon Mentor', // In a real app we might want to populate mentorId
              updatedLiveClass.meetingPlatform || 'Online',
              updatedLiveClass.meetingLink || '',
              true // isUpdate
            );
            sentCount++;
          } catch (emailErr) {
            console.error(`Failed to send update email to ${enrollment.studentId.email}:`, emailErr);
            failedCount++;
          }
        })).catch(err => console.error('Error processing update emails', err));
      }
    } catch (notifErr) {
      console.error('Failed to send notifications for updated live class:', notifErr);
      notificationsFailed = true;
    }

    res.status(200).json({ 
      success: true, 
      data: updatedLiveClass, 
      emailSummary: { totalEligible, sentCount, failedCount },
      message: notificationsFailed ? 'Live class updated successfully. Some app notifications could not be delivered.' : 'Live class updated successfully.' 
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const cancelLiveClass = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const liveClass = await LiveClass.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true });
    if (!liveClass) {
      res.status(404).json({ success: false, message: 'Class not found' });
      return;
    }

    // Notify students of cancellation
    const enrollments = await Enrollment.find({ courseId: liveClass.courseId, status: { $in: ['active', 'completed'] } });
    let studentIdsToNotify: string[] = [];
    if (liveClass.studentIds && liveClass.studentIds.length > 0) {
      studentIdsToNotify = liveClass.studentIds.map(s => s.toString());
    } else {
      studentIdsToNotify = enrollments.map(e => e.studentId.toString());
    }
    
    try {
      if (studentIdsToNotify.length > 0) {
        const notifications = studentIdsToNotify.map(studentId => ({
          title: 'Live Class Cancelled',
          message: `The live class "${liveClass.title}" has been cancelled.`,
          type: 'LIVE_CLASS_CANCELLED',
          recipientRole: ['Student'],
          recipientId: studentId,
          metadata: { liveClassId: liveClass._id, courseId: liveClass.courseId }
        }));
        await Notification.insertMany(notifications);

        const io = getIO();
        studentIdsToNotify.forEach(studentId => {
          io.to(`user:${studentId}`).emit('notification:new', {
            title: 'Live Class Cancelled',
            message: `The live class "${liveClass.title}" has been cancelled.`,
            type: 'LIVE_CLASS_CANCELLED'
          });
        });
      }
    } catch (notifErr) {
      console.error('Failed to send notifications for cancellation:', notifErr);
    }

    res.status(200).json({ success: true, data: liveClass });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const joinLiveClass = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const liveClass = await LiveClass.findById(id);
    if (!liveClass) {
      res.status(404).json({ success: false, message: 'Live class not found' });
      return;
    }

    if (req.user.role === 'Student') {
      const enrollment = await Enrollment.findOne({ studentId: req.user._id, courseId: liveClass.courseId, status: 'active' });
      if (!enrollment) {
        res.status(403).json({ success: false, message: 'You are not actively enrolled in this course.' });
        return;
      }

      const hasStudentIds = liveClass.studentIds && liveClass.studentIds.length > 0;
      if (hasStudentIds) {
        const isSelected = liveClass.studentIds.some(id => id.toString() === req.user._id.toString());
        if (!isSelected) {
          res.status(403).json({ success: false, message: 'You are not selected for this live class.' });
          return;
        }
      }

      const alreadyAttended = liveClass.attendance.some(
        (a) => a.studentId.toString() === req.user._id.toString()
      );
      if (!alreadyAttended) {
        liveClass.attendance.push({
          studentId: req.user._id,
          joinedAt: new Date(),
        });
        await liveClass.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Joined live class successfully',
      meetingLink: liveClass.meetingLink,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const startLiveClass = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const liveClass = await LiveClass.findById(id);
    if (!liveClass) {
      res.status(404).json({ success: false, message: 'Class not found' });
      return;
    }

    if (liveClass.status === 'cancelled') {
      res.status(400).json({ success: false, message: 'Cannot start a cancelled class' });
      return;
    }

    if (!liveClass.meetingLink) {
      res.status(400).json({ success: false, message: 'Meeting link is not available' });
      return;
    }

    try {
      const parsedUrl = new URL(liveClass.meetingLink.trim());
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        res.status(400).json({ success: false, message: 'Invalid meeting link' });
        return;
      }
    } catch {
      res.status(400).json({ success: false, message: 'Invalid meeting link' });
      return;
    }

    liveClass.status = 'live';
    await liveClass.save();

    let studentIdsToNotify: string[] = [];
    if (liveClass.studentIds && liveClass.studentIds.length > 0) {
      studentIdsToNotify = liveClass.studentIds.map(id => id.toString());
    } else {
      const enrollments = await Enrollment.find({ courseId: liveClass.courseId, status: { $in: ['active', 'completed'] } });
      studentIdsToNotify = enrollments.map(e => e.studentId.toString());
    }

    if (studentIdsToNotify.length > 0) {
      const notifications = studentIdsToNotify.map(studentId => ({
        title: 'Live Class Started',
        message: `The live class "${liveClass.title}" is now live.`,
        type: 'LIVE_CLASS_STARTED',
        recipientRole: ['Student'],
        recipientId: studentId,
        metadata: { liveClassId: liveClass._id, courseId: liveClass.courseId }
      }));
      await Notification.insertMany(notifications);

      const io = getIO();
      studentIdsToNotify.forEach(studentId => {
        io.to(`user:${studentId}`).emit('notification:new', {
          title: 'Live Class Started',
          message: `The live class "${liveClass.title}" is now live.`,
          type: 'LIVE_CLASS_STARTED'
        });
      });
    }

    res.status(200).json({ success: true, data: liveClass, message: 'Live class started successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
