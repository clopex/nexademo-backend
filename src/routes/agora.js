const express = require('express');
const router = express.Router();
const { generateToken } = require('../controllers/agoraController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/token', authMiddleware, generateToken);

module.exports = router;