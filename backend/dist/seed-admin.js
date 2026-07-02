"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env before models
dotenv_1.default.config({ path: path_1.default.join(__dirname, '.env') });
const User_1 = __importDefault(require("./models/User"));
const seedAdmin = async () => {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI is not defined in environment variables');
        process.exit(1);
    }
    try {
        console.log('Connecting to database for Admin Seeding...');
        await mongoose_1.default.connect(mongoUri);
        const adminEmail = 'admin@techzonwide.com';
        let admin = await User_1.default.findOne({ email: adminEmail.toLowerCase() });
        if (!admin) {
            admin = new User_1.default({
                name: 'Super Admin',
                email: adminEmail.toLowerCase(),
                password: 'Admin@123',
                role: 'SuperAdmin',
                status: 'active',
                isEmailVerified: true,
            });
            await admin.save();
            console.log(`CONFIRMED: Super Admin user created successfully with email: ${adminEmail}`);
        }
        else {
            // If it exists, ensure the role is updated to SuperAdmin and status is active
            admin.role = 'SuperAdmin';
            admin.status = 'active';
            admin.isEmailVerified = true;
            await admin.save();
            console.log(`CONFIRMED: Existing user ${adminEmail} updated to SuperAdmin role and status set to active.`);
        }
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding Super Admin user:', error);
        process.exit(1);
    }
};
seedAdmin();
