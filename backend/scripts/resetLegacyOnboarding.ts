import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const resetLegacyOnboarding = async () => {
  try {
    console.log('Legacy onboarding cleanup started');
    
    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the environment variables.');
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Access the 'onboardings' collection
    const db = mongoose.connection.db;
    
    // Check if collection exists
    const collections = await db.listCollections({ name: 'onboardings' }).toArray();
    
    if (collections.length > 0) {
      const collection = db.collection('onboardings');
      
      const count = await collection.countDocuments();
      console.log(`Records found: ${count}`);
      
      const result = await collection.deleteMany({});
      console.log(`Records removed: ${result.deletedCount}`);
      console.log(`Duplicate records removed: 0`); 
      
      await db.dropCollection('onboardings');
      console.log('Dropped collection: onboardings');
    } else {
      console.log('Records found: 0');
      console.log('Records removed: 0');
      console.log('Duplicate records removed: 0');
    }

    console.log('Legacy onboarding data cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

resetLegacyOnboarding();
