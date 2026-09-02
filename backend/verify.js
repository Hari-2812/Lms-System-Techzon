const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
// Override Brevo API key for safe local testing
process.env.BREVO_API_KEY = "dummy_brevo_key_for_verification";
const { runDailyReminderJob, runDailyUnlockStatsJob } = require('./dist/scheduler/dailyScheduler');
require('./dist/models/User');
require('./dist/models/Enrollment');
require('./dist/models/Course');
require('./dist/models/Progress');
require('./dist/models/DailyReminderLog');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");
    
    // Dry run
    console.log("--- 7:00 PM REMINDER TEST (Dry Run) ---");
    const reminderResult = await runDailyReminderJob(true);
    console.log("Reminder Dry Run Result:", reminderResult);
    
    // Live Run (Mocked)
    console.log("--- 7:00 PM REMINDER TEST (Live Run) ---");
    // We will do a live run but we will catch any Brevo error
    // In our implementation, Brevo error is caught inside the function and failedCount is incremented.
    const reminderLive = await runDailyReminderJob(false);
    console.log("Reminder Live Result:", reminderLive);
    
    // Run again to check duplicate
    console.log("--- 7:00 PM REMINDER TEST (Duplicate Run) ---");
    const reminderDup = await runDailyReminderJob(false);
    console.log("Reminder Duplicate Result:", reminderDup);

    // 7:30 Unlock
    console.log("--- 7:30 PM UNLOCK TEST ---");
    const unlockStats = await runDailyUnlockStatsJob();
    console.log("Unlock Stats:", unlockStats);
    
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

test();
