import { Request, Response } from 'express';
import LiveClass from '../models/LiveClass';
import AuditLog from '../models/AuditLog';

export const getLiveClasses = async (req: any, res: Response): Promise<void> => {
  try {
    let classes;
    if (['SuperAdmin', 'Admin', 'Mentor', 'Support'].includes(req.user.role)) {
      classes = await LiveClass.find().populate('courseId', 'title').populate('mentorId', 'name email');
    } else {
      // Students only see live classes scheduled for their enrolled courses
      classes = await LiveClass.find({ status: 'scheduled' })
        .populate('courseId', 'title')
        .populate('mentorId', 'name email');
    }
    res.status(200).json({ success: true, data: classes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createLiveClass = async (req: any, res: Response): Promise<void> => {
  try {
    const liveClass = new LiveClass({
      ...req.body,
      mentorId: req.user._id,
    });
    await liveClass.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'CREATE_LIVE_CLASS',
      details: `Scheduled live class: ${liveClass.title} under course ${liveClass.courseId}`,
    });

    res.status(201).json({ success: true, data: liveClass });
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

export const updateLiveClass = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const liveClass = await LiveClass.findByIdAndUpdate(id, req.body, { new: true });
    if (!liveClass) {
      res.status(404).json({ success: false, message: 'Class not found' });
      return;
    }
    res.status(200).json({ success: true, data: liveClass });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};
