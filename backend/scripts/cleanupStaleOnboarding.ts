import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import OnboardingRequest from '../models/OnboardingRequest';
import GoogleSyncRecord from '../models/GoogleSyncRecord';
import User from '../models/User';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const cleanupStaleOnboardingData = async () => {
  const isConfirm = process.argv.includes('--confirm');

  try {
    console.log('====================================');
    console.log('ONBOARDING RESET PREVIEW');
    console.log('====================================\n');
    
    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the environment variables.');
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // 1. Drop potentially problematic legacy index on email
    try {
      const db = mongoose.connection.db;
      if (db) {
        const collection = db.collection('onboardingrequests');
        const indexes = await collection.indexes();
        
        // Look for 'personalDetails.email_1' which might have been created with unique: true
        const emailIndex = indexes.find(idx => idx.name === 'personalDetails.email_1');
        if (emailIndex && emailIndex.unique) {
          console.log('Found legacy unique index on personalDetails.email. Dropping it...');
          await collection.dropIndex('personalDetails.email_1');
          
          // Recreate non-unique index
          await collection.createIndex({ 'personalDetails.email': 1 });
          console.log('Successfully replaced with non-unique index.');
        } else {
          console.log('No problematic unique email index found.');
        }
      }
    } catch (indexError) {
      console.log('Error while checking/dropping indexes (this is often safe to ignore if the collection is empty):', indexError);
    }

    // 2. Identify stale records
    // We want to delete local OnboardingRequests that are NOT linked to an active student.
    const allRequests = await OnboardingRequest.find({ source: 'google_form' });

    let removedCount = 0;
    let preservedActiveCount = 0;

    for (const record of allRequests) {
      // Check if there's an active User with this email
      let userIsActive = false;
      
      if (record.personalDetails && record.personalDetails.email) {
        const user = await User.findOne({ email: record.personalDetails.email.toLowerCase() });
        if (user && user.status === 'active') {
          userIsActive = true;
        }
      }
      
      if (userIsActive) {
        preservedActiveCount++;
      } else {
        if (isConfirm) {
          await OnboardingRequest.findByIdAndDelete(record._id);
          await GoogleSyncRecord.deleteOne({ source: 'google_form', sourceRowId: record.sourceRowId });
        }
        removedCount++;
      }
    }

    console.log(`Onboarding records checked: ${allRequests.length}`);
    console.log(`Active student-linked records preserved: ${preservedActiveCount}`);
    console.log(`Stale onboarding records to remove: ${removedCount}`);
    console.log(`Google Sheet: UNCHANGED`);
    console.log(`Active enrollments: UNCHANGED`);
    console.log(`Course data: UNCHANGED\n`);
    
    if (!isConfirm) {
      console.log('NOTE: This was a dry run. To actually remove the records, run with the --confirm flag.');
      console.log('Example: npx ts-node scripts/cleanupStaleOnboarding.ts --confirm');
    } else {
      console.log(`SUCCESS: ${removedCount} stale records and their sync histories were permanently removed.`);
      console.log('Google Form data and Google Sheet data have been PRESERVED.');
      console.log('The next sync will treat the deleted rows as fresh applications.');
    }

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

cleanupStaleOnboardingData();
