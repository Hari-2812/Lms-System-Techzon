import express from 'express';
import { 
  sendCampaign, 
  saveDraft, 
  getCampaigns, 
  getCampaignDeliveries, 
  retryCampaign, 
  deleteCampaign 
} from '../controllers/emailCampaignController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(authorize('SuperAdmin'));

router.post('/send', sendCampaign);
router.post('/draft', saveDraft);
router.get('/', getCampaigns);
router.get('/:campaignId/deliveries', getCampaignDeliveries);
router.post('/:campaignId/retry', retryCampaign);
router.delete('/:campaignId', deleteCampaign);

export default router;
