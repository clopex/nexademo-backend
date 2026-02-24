const express = require('express');
const router = express.Router();
const { register, login, getMe, googleLogin, appleLogin } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.post('/google', googleLogin);
router.post('/apple', appleLogin);

module.exports = router;