const router = require('express').Router();
const dispute = require('../controllers/dispute.controller');
const authenticate = require('../middleware/auth.middleware');

router.use(authenticate)
router.get('/disputes', dispute.getDispute);
router.get('/disputes/store', dispute.getDisputeByStore);
router.get('/disputes/store/:disputeId', dispute.getDisputeByStoreById);
router.post('/disputes', dispute.createDispute);
router.patch('/disputes/:disputeId', dispute.updateDispute);
router.delete('/disputes/:disputeId', dispute.deleteDispute);
router.patch('/disputes/:disputeId/reply', dispute.replyDispute);

module.exports = router;