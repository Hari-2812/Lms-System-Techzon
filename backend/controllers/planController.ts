import { Request, Response } from 'express';
import LearningPlan from '../models/LearningPlan';
import AuditLog from '../models/AuditLog';

// Seed default plans if they don't exist
export const seedDefaultPlans = async (): Promise<void> => {
  const count = await LearningPlan.countDocuments();
  if (count > 0) return;

  const defaultPlans = [
    {
      name: 'Self-Paced Learning',
      code: 'self-paced',
      price: 2499,
      durationMonths: 6,
      features: {
        recordedClasses: true,
        pdfsAndNotes: true,
        quizzes: true,
        assignments: true,
        communitySupport: true,
        certificates: true,
        liveClasses: false,
        mentorSessions: false,
        doubtClearing: false,
        careerGuidance: false,
        mockInterviews: false,
        resumeReview: false,
        placementSupport: false,
        projectsCount: 2,
      },
    },
    {
      name: 'Mentor-Led Learning',
      code: 'mentor-led',
      price: 5499,
      durationMonths: 6,
      features: {
        recordedClasses: true,
        pdfsAndNotes: true,
        quizzes: true,
        assignments: true,
        communitySupport: true,
        certificates: true,
        liveClasses: true,
        mentorSessions: true,
        doubtClearing: true,
        careerGuidance: true,
        mockInterviews: false,
        resumeReview: false,
        placementSupport: false,
        projectsCount: 4, // 2 extra projects
      },
    },
    {
      name: 'Advanced Mentor Plan',
      code: 'advanced-mentor',
      price: 14999,
      durationMonths: 12,
      features: {
        recordedClasses: true,
        pdfsAndNotes: true,
        quizzes: true,
        assignments: true,
        communitySupport: true,
        certificates: true,
        liveClasses: true,
        mentorSessions: true,
        doubtClearing: true,
        careerGuidance: true,
        mockInterviews: true,
        resumeReview: true,
        placementSupport: true,
        projectsCount: 6,
      },
    },
  ];

  await LearningPlan.insertMany(defaultPlans);
  console.log('Default Learning Plans seeded successfully.');
};

export const getPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = await LearningPlan.find({ isActive: true });
    res.status(200).json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllPlansAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = await LearningPlan.find();
    res.status(200).json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createPlan = async (req: any, res: Response): Promise<void> => {
  try {
    const plan = new LearningPlan(req.body);
    await plan.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'CREATE_PLAN',
      details: `Created new learning plan: ${plan.name}`,
    });

    res.status(201).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updatePlan = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const plan = await LearningPlan.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!plan) {
      res.status(404).json({ success: false, message: 'Plan not found' });
      return;
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'UPDATE_PLAN',
      details: `Updated learning plan: ${plan.name}`,
    });

    res.status(200).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deletePlan = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const plan = await LearningPlan.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!plan) {
      res.status(404).json({ success: false, message: 'Plan not found' });
      return;
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'DELETE_PLAN',
      details: `Deactivated learning plan: ${plan.name}`,
    });

    res.status(200).json({ success: true, message: 'Plan deactivated successfully' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};
