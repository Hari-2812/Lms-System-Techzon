"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPlanFeature = exports.authorize = exports.protect = void 0;
const token_1 = require("../utils/token");
const User_1 = __importDefault(require("../models/User"));
const Enrollment_1 = __importDefault(require("../models/Enrollment"));
const logger_1 = __importDefault(require("../config/logger"));
const protect = async (req, res, next) => {
    let token;
    // Read token from authorization header or cookie
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    if (!token) {
        res.status(401).json({ success: false, message: 'Not authorized to access this route' });
        return;
    }
    try {
        const decoded = (0, token_1.verifyAccessToken)(token);
        const user = await User_1.default.findById(decoded.id).select('-password');
        if (!user) {
            res.status(401).json({ success: false, message: 'User not found with this token' });
            return;
        }
        if (user.status !== 'active') {
            res.status(403).json({ success: false, message: `User status is ${user.status}. Access denied.` });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        logger_1.default.error('JWT Verification error:', error);
        res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
};
exports.protect = protect;
// RBAC Roles verification middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: `User role '${req.user?.role || 'unknown'}' is not authorized to access this route`,
            });
            return;
        }
        next();
    };
};
exports.authorize = authorize;
// Dynamic feature verification based on subscription plan
const checkPlanFeature = (featureName) => {
    return async (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }
        // Admins, Super Admins, and Support Executives bypass features controls
        if (['super-admin', 'admin', 'support'].includes(user.role)) {
            next();
            return;
        }
        // Mentors can access course-related pages
        if (user.role === 'mentor') {
            next();
            return;
        }
        // For students, find active course enrollment
        // If the path contains courseId, we check that specific course, otherwise general check
        const courseId = req.params.courseId || req.body.courseId || req.query.courseId;
        if (!courseId) {
            res.status(400).json({ success: false, message: 'Course ID context is required for this action' });
            return;
        }
        try {
            const enrollment = await Enrollment_1.default.findOne({
                studentId: user._id,
                courseId: courseId,
                status: 'active',
                expiryDate: { $gt: new Date() },
            }).populate('learningPlanId');
            if (!enrollment) {
                res.status(403).json({
                    success: false,
                    message: 'No active enrollment found for this course or subscription has expired.',
                });
                return;
            }
            const plan = enrollment.learningPlanId;
            if (!plan || !plan.isActive) {
                res.status(403).json({ success: false, message: 'Associated learning plan is inactive.' });
                return;
            }
            // Check if feature is enabled
            const hasFeature = plan.features[featureName];
            if (hasFeature === undefined || hasFeature === false) {
                res.status(403).json({
                    success: false,
                    message: `The feature '${featureName}' is not enabled in your current plan (${plan.name})`,
                });
                return;
            }
            next();
        }
        catch (error) {
            logger_1.default.error('Error verifying plan features permissions:', error);
            res.status(500).json({ success: false, message: 'Internal server error validating features access' });
        }
    };
};
exports.checkPlanFeature = checkPlanFeature;
