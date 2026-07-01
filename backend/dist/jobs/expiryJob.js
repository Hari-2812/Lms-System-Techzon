"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startExpiryScheduler = exports.runExpiryCheck = void 0;
const Enrollment_1 = __importDefault(require("../models/Enrollment"));
const logger_1 = __importDefault(require("../config/logger"));
const runExpiryCheck = async () => {
    try {
        const now = new Date();
        const result = await Enrollment_1.default.updateMany({ status: 'active', expiryDate: { $lte: now } }, { $set: { status: 'expired' } });
        logger_1.default.info(`Automated enrollment expiry check executed. Expired ${result.modifiedCount} courses subscriptions.`);
    }
    catch (error) {
        logger_1.default.error('Error running automated enrollment expiry check job:', error);
    }
};
exports.runExpiryCheck = runExpiryCheck;
// Execute every 24 hours
const startExpiryScheduler = () => {
    // Run once immediately on start
    (0, exports.runExpiryCheck)();
    // Set 24 hour interval
    setInterval(exports.runExpiryCheck, 24 * 60 * 60 * 1000);
};
exports.startExpiryScheduler = startExpiryScheduler;
