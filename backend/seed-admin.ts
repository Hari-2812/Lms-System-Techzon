import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env before models
dotenv.config({ path: path.join(__dirname, '.env') });

import User from './models/User';

const seedAdmin = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    console.log('Connecting to database for Admin Seeding...');
    await mongoose.connect(mongoUri);
    
    const adminEmail = 'admin@techzonwide.com';
    let admin = await User.findOne({ email: adminEmail.toLowerCase() });

    if (!admin) {
      admin = new User({
        name: 'Super Admin',
        email: adminEmail.toLowerCase(),
        password: 'Admin@123',
        role: 'SuperAdmin',
        status: 'active',
        isEmailVerified: true,
      });
      await admin.save();
      console.log(`CONFIRMED: Super Admin user created successfully with email: ${adminEmail}`);
    } else {
      // If it exists, ensure the role is updated to SuperAdmin and status is active
      admin.role = 'SuperAdmin';
      admin.status = 'active';
      admin.isEmailVerified = true;
      await admin.save();
      console.log(`CONFIRMED: Existing user ${adminEmail} updated to SuperAdmin role and status set to active.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding Super Admin user:', error);
    process.exit(1);
  }
};

seedAdmin();
