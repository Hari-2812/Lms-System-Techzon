import {
 Response,
 NextFunction
} from "express";

import {
 AuthenticatedRequest
} from "../types/auth";

import { verifyAccessToken } from '../utils/token';
import User from '../models/User';
import Enrollment from '../models/Enrollment';
import LearningPlan from '../models/LearningPlan';
import logger from '../config/logger';

export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  // Read token from authorization header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found with this token' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ success: false, message: `User status is ${user.status}. Access denied.` });
      return;
    }

    req.user = user as any;
    next();
  } catch (error) {
    logger.error('JWT Verification error:', error);
    res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

// RBAC Roles verification middleware
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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

// Dynamic feature verification based on subscription plan
export const checkPlanFeature = (featureName: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    // Admins, Super Admins, and Support Executives bypass features controls
    if (['SuperAdmin', 'Admin', 'Support'].includes(user.role)) {
      next();
      return;
    }

    // Mentors can access course-related pages
    if (user.role === 'Mentor') {
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
      const enrollment = await Enrollment.findOne({
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

      const plan = enrollment.learningPlanId as any;
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
    } catch (error) {
      logger.error('Error verifying plan features permissions:', error);
      res.status(500).json({ success: false, message: 'Internal server error validating features access' });
    }
  };
};
