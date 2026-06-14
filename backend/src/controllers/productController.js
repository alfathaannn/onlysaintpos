const prisma = require('../utils/prisma');

// [GET] /api/products
const getAllProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true // Join dengan tabel kategori agar dapat nama kategori
      },
      orderBy: {
        name: 'asc' // Urutkan berdasarkan nama (opsional)
      }
    });

    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    // Melempar error ke middleware errorHandler
    next(error);
  }
};

module.exports = {
  getAllProducts
};
