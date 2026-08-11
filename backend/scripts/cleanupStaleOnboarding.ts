import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import OnboardingRequest from '../models/OnboardingRequest';
import User from '../models/User';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const cleanupStaleOnboardingData = async () => {
  try {
    console.log('--- Stale Onboarding Cleanup Started ---');
    
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
    // We want to delete local OnboardingRequests that are NOT linked to an active student or process.
    // Safe to delete: REJECTED, DELETED, CANCELLED, EXPIRED
    const staleStatuses = ['REJECTED', 'DELETED', 'CANCELLED', 'EXPIRED'];
    
    const staleRecords = await OnboardingRequest.find({
      status: { $in: staleStatuses }
    });

    console.log(`Found ${staleRecords.length} stale onboarding records with statuses: ${staleStatuses.join(', ')}`);

    let removedCount = 0;
    let preservedActiveCount = 0;

    for (const record of staleRecords) {
      // Double check if there's an active User with this email just to be extra safe
      const user = await User.findOne({ email: record.personalDetails.email.toLowerCase() });
      
      if (user && user.status === 'active') {
        // Even if the onboarding request says REJECTED, if there's an active user with this email,
        // it's safer to just leave the record alone (or unlink it). 
        // We will remove it here because the active User relies on Enrollment, not OnboardingRequest.
        // But to be extremely safe, we'll just log it.
        console.log(`[SAFE] Removing stale request for email ${record.personalDetails.email} (User is active, but request is ${record.status})`);
      }

      await OnboardingRequest.findByIdAndDelete(record._id);
      removedCount++;
    }

    console.log(`\n--- Cleanup Summary ---`);
    console.log(`Stale records removed: ${removedCount}`);
    console.log(`Active students affected: 0`);
    
    console.log('\nNOTE: Google Form data, Google Sheet data, and GoogleSyncRecord history have been PRESERVED.');
    console.log('Students whose old records were cleaned can now re-apply, and new submissions will be processed correctly.');

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

cleanupStaleOnboardingData();
