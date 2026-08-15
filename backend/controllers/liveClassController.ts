import { Request, Response } from 'express';
import LiveClass from '../models/LiveClass';
import AuditLog from '../models/AuditLog';
import Enrollment from '../models/Enrollment';
import Notification from '../models/Notification';
import { getIO } from '../services/socketService';

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
        const studentCount = await Enrollment.countDocuments({ courseId: cls.courseId, status: 'active' });
        return { ...cls.toObject(), registeredStudents: studentCount };
      }));
      res.status(200).json({ success: true, data: classesWithCount });
      return;
    } else {
      // Students only see live classes scheduled for their actively enrolled courses
      const enrollments = await Enrollment.find({ studentId: req.user._id, status: 'active' }).select('courseId');
      const courseIds = enrollments.map(e => e.courseId);

      classes = await LiveClass.find({ courseId: { $in: courseIds } })
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
      const activeEnrollments = await Enrollment.find({ courseId: liveClass.courseId, status: 'active' })
        .populate('studentId', 'name email status');
      
      res.status(200).json({ success: true, data: { ...liveClass.toObject(), students: activeEnrollments } });
    } else {
      // Student verification
      const enrollment = await Enrollment.findOne({ studentId: req.user._id, courseId: liveClass.courseId, status: 'active' });
      if (!enrollment) {
        res.status(403).json({ success: false, message: 'Not authorized to view this class' });
        return;
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

    // Notify registered students
    const enrollments = await Enrollment.find({ courseId: liveClass.courseId, status: 'active' });
    const studentIds = enrollments.map(e => e.studentId);
    
    let notificationsFailed = false;
    try {
      if (studentIds.length > 0) {
        const notifications = studentIds.map(studentId => ({
          title: 'Live Class Scheduled',
          message: `A new live class "${liveClass.title}" has been scheduled for your course.`,
          type: 'LIVE_CLASS_CREATED',
          recipientRole: ['Student'],
          recipientId: studentId,
          metadata: { liveClassId: liveClass._id, courseId: liveClass.courseId }
        }));
        await Notification.insertMany(notifications);

        const io = getIO();
        studentIds.forEach(studentId => {
          io.to(`user:${studentId}`).emit('notification:new', {
            title: 'Live Class Scheduled',
            message: `A new live class "${liveClass.title}" has been scheduled.`,
            type: 'LIVE_CLASS_CREATED'
          });
        });
      }
    } catch (notifErr) {
      console.error('Failed to send notifications for new live class:', notifErr);
      notificationsFailed = true;
    }

    res.status(201).json({ 
      success: true, 
      data: liveClass, 
      message: notificationsFailed ? 'Live class created successfully. Some notifications could not be delivered.' : 'Live class created successfully.' 
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateLiveClass = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const liveClass = await LiveClass.findByIdAndUpdate(id, req.body, { new: true });
    if (!liveClass) {
      res.status(404).json({ success: false, message: 'Class not found' });
      return;
    }

    // Notify students of update
    const enrollments = await Enrollment.find({ courseId: liveClass.courseId, status: 'active' });
    const studentIds = enrollments.map(e => e.studentId);
    
    try {
      if (studentIds.length > 0) {
        const notifications = studentIds.map(studentId => ({
          title: 'Live Class Updated',
          message: `Your live class "${liveClass.title}" has been updated.`,
          type: 'LIVE_CLASS_UPDATED',
          recipientRole: ['Student'],
          recipientId: studentId,
          metadata: { liveClassId: liveClass._id, courseId: liveClass.courseId }
        }));
        await Notification.insertMany(notifications);

        const io = getIO();
        studentIds.forEach(studentId => {
          io.to(`user:${studentId}`).emit('notification:new', {
            title: 'Live Class Updated',
            message: `Your live class "${liveClass.title}" has been updated.`,
            type: 'LIVE_CLASS_UPDATED'
          });
        });
      }
    } catch (notifErr) {
      console.error('Failed to send notifications for update:', notifErr);
    }

    res.status(200).json({ success: true, data: liveClass });
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
    const enrollments = await Enrollment.find({ courseId: liveClass.courseId, status: 'active' });
    const studentIds = enrollments.map(e => e.studentId);
    
    try {
      if (studentIds.length > 0) {
        const notifications = studentIds.map(studentId => ({
          title: 'Live Class Cancelled',
          message: `The live class "${liveClass.title}" has been cancelled.`,
          type: 'LIVE_CLASS_CANCELLED',
          recipientRole: ['Student'],
          recipientId: studentId,
          metadata: { liveClassId: liveClass._id, courseId: liveClass.courseId }
        }));
        await Notification.insertMany(notifications);

        const io = getIO();
        studentIds.forEach(studentId => {
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
