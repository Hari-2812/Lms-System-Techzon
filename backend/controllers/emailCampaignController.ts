import { Request, Response } from 'express';
import EmailCampaign from '../models/EmailCampaign';
import EmailDelivery from '../models/EmailDelivery';
import User from '../models/User';
import Course from '../models/Course';
import LiveClass from '../models/LiveClass';
import { sendDynamicEmail } from '../services/email';

export const sendCampaign = async (req: any, res: Response): Promise<void> => {
  try {
    const { recipientIds, subject, htmlContent, templateType, courseId, liveClassId } = req.body;

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      res.status(400).json({ success: false, message: 'No recipients selected' });
      return;
    }

    if (!subject || !htmlContent || !templateType) {
      res.status(400).json({ success: false, message: 'Subject, templateType and htmlContent are required' });
      return;
    }

    // Find valid students
    const uniqueIds = [...new Set(recipientIds)];
    const students = await User.find({ _id: { $in: uniqueIds }, role: 'Student' });
    
    if (students.length === 0) {
      res.status(400).json({ success: false, message: 'No valid students found' });
      return;
    }

    const campaign = new EmailCampaign({
      subject,
      templateType,
      htmlContent,
      courseId: courseId || undefined,
      liveClassId: liveClassId || undefined,
      recipientCount: students.length,
      pendingCount: students.length,
      status: 'sending',
      createdBy: req.user._id,
    });

    await campaign.save();

    // Create delivery records
    const deliveries = students.map(student => ({
      campaignId: campaign._id,
      studentId: student._id,
      email: student.email,
      status: 'pending'
    }));

    await EmailDelivery.insertMany(deliveries);

    // Process emails asynchronously
    processCampaign(campaign._id.toString(), students, subject, htmlContent);

    res.status(200).json({
      success: true,
      message: 'Email processing started',
      totalRecipients: students.length,
      accepted: students.length,
      failed: 0,
      campaignId: campaign._id
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const processCampaign = async (campaignId: string, students: any[], subject: string, htmlContent: string) => {
  let sentCount = 0;
  let failedCount = 0;

  for (const student of students) {
    let status: 'sent' | 'failed' = 'failed';
    let errorMessage = '';

    try {
      if (!student.email) throw new Error('Missing email address');
      
      const result = await sendDynamicEmail(student.email, subject, htmlContent);
      if (result.success) {
        status = 'sent';
        sentCount++;
      } else {
        throw new Error('Email sending failed');
      }
    } catch (error: any) {
      status = 'failed';
      failedCount++;
      errorMessage = error.message;
      console.error(`Failed to send campaign email to ${student.email}:`, error);
    }

    await EmailDelivery.findOneAndUpdate(
      { campaignId, studentId: student._id },
      { 
        status, 
        errorMessage: errorMessage || undefined, 
        sentAt: status === 'sent' ? new Date() : undefined 
      }
    );
  }

  await EmailCampaign.findByIdAndUpdate(campaignId, {
    status: failedCount === students.length ? 'failed' : 'completed',
    sentCount,
    failedCount,
    pendingCount: 0
  });
};

export const saveDraft = async (req: any, res: Response): Promise<void> => {
  try {
    const { subject, htmlContent, templateType, courseId, liveClassId } = req.body;

    const campaign = new EmailCampaign({
      subject: subject || 'Untitled Draft',
      templateType: templateType || 'custom',
      htmlContent: htmlContent || '',
      courseId: courseId || undefined,
      liveClassId: liveClassId || undefined,
      status: 'draft',
      createdBy: req.user._id,
    });

    await campaign.save();
    res.status(201).json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCampaigns = async (req: any, res: Response): Promise<void> => {
  try {
    const campaigns = await EmailCampaign.find()
      .populate('createdBy', 'name email')
      .populate('courseId', 'title')
      .populate('liveClassId', 'title scheduledTime')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: campaigns });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCampaignDeliveries = async (req: any, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const deliveries = await EmailDelivery.find({ campaignId })
      .populate('studentId', 'name email');
    res.status(200).json({ success: true, data: deliveries });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const retryCampaign = async (req: any, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    const failedDeliveries = await EmailDelivery.find({ campaignId, status: 'failed' }).populate<{studentId: any}>('studentId');
    if (failedDeliveries.length === 0) {
      res.status(400).json({ success: false, message: 'No failed deliveries to retry' });
      return;
    }

    await EmailCampaign.findByIdAndUpdate(campaignId, {
      status: 'sending',
      pendingCount: campaign.pendingCount + failedDeliveries.length,
      failedCount: campaign.failedCount - failedDeliveries.length
    });

    await EmailDelivery.updateMany(
      { campaignId, status: 'failed' },
      { status: 'pending', errorMessage: '' }
    );

    const students = failedDeliveries.map(d => d.studentId).filter(s => s);
    processCampaign(campaignId, students, campaign.subject, campaign.htmlContent);

    res.status(200).json({
      success: true,
      message: `Retrying ${students.length} failed emails`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCampaign = async (req: any, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const campaign = await EmailCampaign.findById(campaignId);
    
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    if (campaign.status === 'sending') {
      res.status(400).json({ success: false, message: 'Cannot delete a campaign that is currently sending' });
      return;
    }

    await EmailDelivery.deleteMany({ campaignId });
    await EmailCampaign.findByIdAndDelete(campaignId);
    
    res.status(200).json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
