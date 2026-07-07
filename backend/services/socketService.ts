import { Server } from 'socket.io';
import http from 'http';
import { verifyAccessToken } from '../utils/token';
import User from '../models/User';
import logger from '../config/logger';

let io: Server | null = null;

export const initSocket = (server: http.Server): Server => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  // Verify JWT token in Socket.IO middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Handle Bearer prefix if present
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = verifyAccessToken(cleanToken);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (user.status !== 'active') {
        return next(new Error(`Authentication error: User status is ${user.status}`));
      }

      // Attach user to socket
      socket.data.user = user;
      next();
    } catch (err: any) {
      logger.error('Socket authentication error:', err);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`[BACKEND] Socket connected for user: ${user.email} (Role: ${user.role}), socket.id: ${socket.id}`);
    logger.info(`Socket connected for user ${user.email} (${user.role}), socket.id: ${socket.id}`);

    // Join room based on user role
    socket.join(`role:${user.role}`);
    
    // Join room based on userId
    socket.join(`user:${user._id.toString()}`);

    // Join the admins room if user is an Admin or SuperAdmin
    if (user.role === 'Admin' || user.role === 'SuperAdmin') {
      socket.join('admins');
      console.log(`[BACKEND] User ${user.email} successfully joined the 'admins' room.`);
    }

    // Broadcast announcements (legacy compatibility)
    socket.on('send_announcement', (data) => {
      if (io) {
        console.log(`[BACKEND] Broadcasting announcement:`, data);
        io.emit('announcement_received', data);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id} for user ${user.email}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
};
