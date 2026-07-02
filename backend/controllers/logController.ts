import { Request, Response } from 'express';
import SystemLog from '../models/SystemLog';
import logger from '../config/logger';

export const postRuntimeError = async (req: Request, res: Response): Promise<void> => {
  const { message, stack, url, userId, browser, timestamp } = req.body;

  if (!message) {
    res.status(400).json({ success: false, message: 'Log message is required' });
    return;
  }

  try {
    const log = new SystemLog({
      message,
      stack,
      url,
      userId,
      browser,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    await log.save();
    res.status(201).json({ success: true, message: 'Runtime error log registered.' });
  } catch (error: any) {
    logger.error('Failed to write runtime error log to DB:', error);
    res.status(500).json({ success: false, message: 'Internal server logger failure' });
  }
};
