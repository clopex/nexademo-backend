const express = require('express');
const router = express.Router();
const { register, login, getMe, googleLogin, appleLogin, updateProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.post('/google', googleLogin);
router.post('/apple', appleLogin);
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;