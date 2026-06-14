const express = require('express');
const { createOrder, simulateQRIS } = require('../controllers/orderController');

const router = express.Router();

// Route: POST /api/orders
router.post('/', createOrder);

// POST /api/orders/:orderNumber/simulate-qris
router.post('/:orderNumber/simulate-qris', simulateQRIS);

module.exports = router;
