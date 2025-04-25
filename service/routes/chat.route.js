const express = require('express');
const router = express.Router();
const { messageUpload } = require('../middleware/upload.middleware');
const { uploadErrorHandler } = require('../middleware/errorHandle.middleware');
const authenticate = require('../middleware/auth.middleware');

// Import controllers
const sellerChatController = require('../controllers/seller.chat.controller');
const buyerChatController = require('../controllers/buyer.chat.controller');
const sharedChatController = require('../controllers/shared.chat.controller');

// Apply authentication middleware to all routes
router.use(authenticate);

router.post("/:sellerId/:productId", 
  messageUpload.array('images', 5), 
  uploadErrorHandler, 
  buyerChatController.sendChatWithProduct
);


// Buyer routes
router.post("/chat-to-seller", 
  messageUpload.array('images', 5), 
  uploadErrorHandler, 
  buyerChatController.sendChatToSeller
);
router.get('/messages/coversation/buyer', buyerChatController.getConversationDetailBuyer);
router.get('/conversations/buyer', buyerChatController.getBuyerConversations);
router.get('/conversations/:conversationId/messages', buyerChatController.getConversationMessagesBuyer);
// Seller routes
router.get("/conversations/seller", sellerChatController.getConversationsSeller);
router.get("/messages/conversation/:conversationId", sharedChatController.getConversationHistory);
router.patch("/messages/conversation/:conversationId/read", sharedChatController.markMessagesAsRead);
router.post("/chat-to-buyer", 
  messageUpload.array('images', 5), 
  uploadErrorHandler, 
  sellerChatController.sendChatBuyer
);
module.exports = router;