import { Request, Response } from 'express';
import SupportTicket from '../models/SupportTicket';
import AuditLog from '../models/AuditLog';

export const createTicket = async (req: any, res: Response): Promise<void> => {
  const { subject, description, category, priority } = req.body;
  try {
    const ticket = new SupportTicket({
      studentId: req.user._id,
      subject,
      description,
      category,
      priority,
      messages: [
        {
          senderId: req.user._id,
          message: description,
          createdAt: new Date(),
        },
      ],
    });
    await ticket.save();

    res.status(201).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getTickets = async (req: any, res: Response): Promise<void> => {
  try {
    let tickets;
    if (['super-admin', 'admin', 'support'].includes(req.user.role)) {
      tickets = await SupportTicket.find()
        .populate('studentId', 'name email')
        .populate('assignedTo', 'name email');
    } else {
      tickets = await SupportTicket.find({ studentId: req.user._id });
    }
    res.status(200).json({ success: true, data: tickets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const addMessageToTicket = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message) {
    res.status(400).json({ success: false, message: 'Message text is required' });
    return;
  }

  try {
    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    // Security check: Only students who created it, or admin/support roles can add messages
    if (
      req.user.role === 'student' &&
      ticket.studentId.toString() !== req.user._id.toString()
    ) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    ticket.messages.push({
      senderId: req.user._id,
      message,
      createdAt: new Date(),
    });

    // If support agent replies, change status to in-progress
    if (['super-admin', 'admin', 'support'].includes(req.user.role)) {
      ticket.status = 'in-progress';
      ticket.assignedTo = req.user._id;
    }

    await ticket.save();
    res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateTicketStatus = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body; // e.g. resolved, closed

  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'UPDATE_TICKET',
      details: `Updated ticket ${ticket._id} status to ${status}`,
    });

    res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
