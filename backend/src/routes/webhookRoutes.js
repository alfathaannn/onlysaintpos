const express = require('express');
const { handleXenditWebhook } = require('../controllers/webhookController');

const router = express.Router();

// Route: POST /api/webhooks/xendit
router.post('/xendit', handleXenditWebhook);

module.exports = router;
