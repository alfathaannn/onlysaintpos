require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');

// Import Routes
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Mengizinkan request dari frontend
app.use(express.json()); // Mem-parsing body request dengan format JSON

// Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/webhooks', webhookRoutes);

// Test Route Dasar
app.get('/', (req, res) => {
  res.send('Onlysaint POS API is running...');
});

// Middleware Error Handler (Harus ditaruh paling bawah, setelah semua routes)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
