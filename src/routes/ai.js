const express = require('express');
const router = express.Router();
const { chat, getChatHistory, clearChatHistory } = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/chat', authMiddleware, chat);
router.get('/chat/history', authMiddleware, getChatHistory);
router.delete('/chat/history', authMiddleware, clearChatHistory);

module.exports = router;