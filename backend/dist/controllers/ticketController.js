"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTicketStatus = exports.addMessageToTicket = exports.getTickets = exports.createTicket = void 0;
const SupportTicket_1 = __importDefault(require("../models/SupportTicket"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const createTicket = async (req, res) => {
    const { subject, description, category, priority } = req.body;
    try {
        const ticket = new SupportTicket_1.default({
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
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.createTicket = createTicket;
const getTickets = async (req, res) => {
    try {
        let tickets;
        if (['super-admin', 'admin', 'support'].includes(req.user.role)) {
            tickets = await SupportTicket_1.default.find()
                .populate('studentId', 'name email')
                .populate('assignedTo', 'name email');
        }
        else {
            tickets = await SupportTicket_1.default.find({ studentId: req.user._id });
        }
        res.status(200).json({ success: true, data: tickets });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getTickets = getTickets;
const addMessageToTicket = async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    if (!message) {
        res.status(400).json({ success: false, message: 'Message text is required' });
        return;
    }
    try {
        const ticket = await SupportTicket_1.default.findById(id);
        if (!ticket) {
            res.status(404).json({ success: false, message: 'Ticket not found' });
            return;
        }
        // Security check: Only students who created it, or admin/support roles can add messages
        if (req.user.role === 'student' &&
            ticket.studentId.toString() !== req.user._id.toString()) {
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.addMessageToTicket = addMessageToTicket;
const updateTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // e.g. resolved, closed
    try {
        const ticket = await SupportTicket_1.default.findByIdAndUpdate(id, { status }, { new: true });
        if (!ticket) {
            res.status(404).json({ success: false, message: 'Ticket not found' });
            return;
        }
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'UPDATE_TICKET',
            details: `Updated ticket ${ticket._id} status to ${status}`,
        });
        res.status(200).json({ success: true, data: ticket });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.updateTicketStatus = updateTicketStatus;
