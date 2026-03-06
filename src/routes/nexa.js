const express = require('express');
const router = express.Router();
const { parseNexaCommand } = require('../controllers/nexaController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/parse', authMiddleware, parseNexaCommand);

module.exports = router;