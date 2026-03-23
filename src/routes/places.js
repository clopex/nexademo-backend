const express = require('express');
const router = express.Router();
const { createWalletPass } = require('../controllers/placesController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/wallet-pass', authMiddleware, createWalletPass);

module.exports = router;
