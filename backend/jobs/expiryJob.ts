import Enrollment from '../models/Enrollment';
import logger from '../config/logger';

export const runExpiryCheck = async (): Promise<void> => {
  try {
    const now = new Date();
    const result = await Enrollment.updateMany(
      { status: 'active', expiryDate: { $lte: now } },
      { $set: { status: 'expired' } }
    );
    logger.info(`Automated enrollment expiry check executed. Expired ${result.modifiedCount} courses subscriptions.`);
  } catch (error) {
    logger.error('Error running automated enrollment expiry check job:', error);
  }
};

// Execute every 24 hours
export const startExpiryScheduler = (): void => {
  // Run once immediately on start
  runExpiryCheck();
  
  // Set 24 hour interval
  setInterval(runExpiryCheck, 24 * 60 * 60 * 1000);
};
