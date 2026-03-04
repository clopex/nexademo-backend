const express = require('express');
const router = express.Router();
const { createPaymentIntent, confirmPayment, getPaymentHistory } = require('../controllers/paymentsController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create-intent', authMiddleware, createPaymentIntent);
router.post('/confirm', authMiddleware, confirmPayment);
router.get('/history', authMiddleware, getPaymentHistory);

module.exports = router;