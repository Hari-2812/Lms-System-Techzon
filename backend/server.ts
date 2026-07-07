import dotenv from 'dotenv';
import path from 'path';
// Load environment variables immediately
dotenv.config({ path: path.join(__dirname, '.env') });

import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initSocket } from './services/socketService';
import { connectDB } from './config/db';
import logger from './config/logger';

// Routing
import apiRoutes from './routes/api';

// Seeding utilities
import { seedDefaultPlans } from './controllers/planController';
import { seedDefaultCourses } from './controllers/courseController';
import { seedDefaultSettings } from './controllers/analyticsController';
import { startExpiryScheduler } from './jobs/expiryJob';
import { startGoogleSheetWatcher } from './jobs/googleSheetWatcher';

const app = express();
const server = http.createServer(app);
const io = initSocket(server);

const PORT = process.env.PORT || 5000;

// Log Cloudinary connection status
console.log('Cloudinary Connected:', process.env.CLOUDINARY_CLOUD_NAME);

// Connect Database
connectDB().then(async () => {
  try {
    // Run automated seeding
    await seedDefaultPlans();
    await seedDefaultCourses();
    await seedDefaultSettings();
    startExpiryScheduler();
    startGoogleSheetWatcher();
  } catch (error) {
    logger.error('Database seeding failed:', error);
  }
});

// Middleware Stack
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Rate Limiting (Prevent Brute Force)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' },
});
app.use('/api/', (req, res, next) => {
  if (req.originalUrl && req.originalUrl.includes('/health')) {
    return next();
  }
  return limiter(req, res, next);
});

// JSON Body Parser & URL Encoding
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom Zero-Dependency Cookie Parser Middleware
app.use((req: any, res: Response, next: NextFunction) => {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie: string) => {
      const parts = cookie.split('=');
      const key = parts.shift()?.trim();
      const val = parts.join('=')?.trim();
      if (key) {
        list[key] = decodeURIComponent(val);
      }
    });
  }
  req.cookies = list;
  next();
});

// API Routes mounting
app.use('/api/v1', apiRoutes);

// Base Check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Socket.IO is initialized and managed by socketService.ts

// Run server
server.listen(PORT as number, "0.0.0.0", () => {
  logger.info(`Techzon LMS Backend server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
