
const express = require('express');
const router = express.Router();
const { messageUpload } = require('../middleware/upload.middleware');
const { uploadErrorHandler } = require('../middleware/errorHandle.middleware');
const ctrl = require('../controllers/chat.controller');
const authenticate = require('../middleware/auth.middleware');

router.use(authenticate);

router.get("/conversations/seller", authenticate, ctrl.getConversationsSeller)

router.get("/messages/conversation/:conversationId", authenticate, ctrl.getConversationHistory)

router.patch("/messages/conversation/:conversationId/read", authenticate, ctrl.markMessagesAsRead)

router.post("/:sellerId/:productId",authenticate ,messageUpload.array('images', 5),uploadErrorHandler,ctrl.sendChatWithProduct )
router.post("/chat-to-buyer",authenticate ,messageUpload.array('images', 5),uploadErrorHandler,ctrl.sendChatBuyer)
// buyer
//send message to seller
router.post("/chat-to-seller",authenticate ,messageUpload.array('images', 5),uploadErrorHandler,ctrl.sendChatToSeller)
// Get all conversations for the buyer
router.get('/conversations/buyer', ctrl.getBuyerConversations);

//Get detail of a specific conversation
router.get('/messages/coversation/buyer', ctrl.getConversationDetailBuyer);

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages', ctrl.getConversationMessagesBuyer);

// Get products discussed in a conversation
router.get('/conversations/:conversationId/products', ctrl.getConversationProducts);

module.exports = router