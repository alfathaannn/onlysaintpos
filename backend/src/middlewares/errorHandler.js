// Middleware untuk menangani error secara global
const errorHandler = (err, req, res, next) => {
  console.error('Error Stack:', err.stack);

  // Default error message dan status code
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Terjadi kesalahan pada server';

  // Format response error JSON yang seragam
  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack // Sembunyikan stack trace di production
  });
};

module.exports = errorHandler;
