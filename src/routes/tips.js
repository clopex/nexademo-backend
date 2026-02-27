const express = require('express');
const router = express.Router();
const { getDailyTip } = require('../controllers/tipsController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/daily', authMiddleware, getDailyTip);

module.exports = router;