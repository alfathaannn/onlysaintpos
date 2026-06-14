const express = require('express');
const { getAllProducts } = require('../controllers/productController');

const router = express.Router();

// Route: GET /api/products
router.get('/', getAllProducts);

module.exports = router;
