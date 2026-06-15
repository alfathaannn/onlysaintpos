const prisma = require('../utils/prisma');
const { Xendit } = require('xendit-node');
const axios = require('axios');
const pusher = require('../utils/pusher');

// (SDK tidak dipakai untuk pembuatan QRIS karena xendit-node v7 telah mengubah struktur API-nya)

// [POST] /api/orders
const createOrder = async (req, res, next) => {
  try {
    const { userId, paymentMethod, items } = req.body;

    // 1. Validasi Input Dasar
    if (!userId || !paymentMethod || !items || items.length === 0) {
      res.status(400); // Bad Request
      throw new Error('Mohon lengkapi userId, paymentMethod, dan items.');
    }

    // 2. Mengambil harga asli produk dari database untuk keamanan
    // Kita tidak mempercayai harga dari frontend (req.body), kita hitung ulang
    let totalAmount = 0;
    const orderItemsToCreate = [];

    for (const item of items) {
      // Cek apakah produk ada di database
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        res.status(404);
        throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
      }

      // Pastikan stok mencukupi (Opsional, tapi penting)
      if (product.stock < item.quantity) {
        res.status(400);
        throw new Error(`Stok tidak cukup untuk produk: ${product.name}. Stok tersisa: ${product.stock}`);
      }

      // Hitung subtotal
      const itemPrice = Number(product.price); // konversi dari Decimal ke Number agar bisa dikali
      const subtotal = itemPrice * item.quantity;
      totalAmount += subtotal;

      // Siapkan data untuk tabel OrderItem
      orderItemsToCreate.push({
        productId: product.id,
        quantity: item.quantity,
        price: itemPrice // Menyimpan harga snapshot (penting untuk histori)
      });
    }

    // 3. Generate Order Number (Contoh: ORD-YYYYMMDD-HHMMSS)
    const date = new Date();
    const dateString = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const timeString = date.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
    const orderNumber = `ORD-${dateString}-${timeString}`;

    // 4. PRISMA TRANSACTION
    // Menjalankan beberapa query sekaligus. Jika salah satu gagal, semuanya di-rollback.
    let newOrder = await prisma.$transaction(async (tx) => {
      // 4a. Kurangi stok produk
      for (const item of orderItemsToCreate) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // 4b. Buat Order & OrderItem
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          paymentMethod,
          totalAmount,
          status: paymentMethod === 'CASH' ? 'PAID' : 'PENDING',
          // Nested Create: Prisma otomatis membuat OrderItems dan menyambungkan ID-nya
          items: {
            create: orderItemsToCreate
          }
        },
        include: {
          items: true, // Kembalikan response termasuk items-nya
          user: {
            select: { name: true } // Kembalikan juga nama kasirnya
          }
        }
      });

      return order;
    });

    // 5. JIKA PAYMENT METHOD QRIS, GENERATE QRIS VIA XENDIT
    let qrString = null;
    if (paymentMethod === 'QRIS') {
      try {
        // Kita gunakan axios langsung untuk menghindari masalah beda versi xendit-node SDK
        const encodedKey = Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64');
        
        const qrResponse = await axios.post(
          'https://api.xendit.co/qr_codes',
          {
            reference_id: orderNumber,
            type: 'DYNAMIC',
            currency: 'IDR',
            amount: totalAmount
          },
          {
            headers: {
              'Authorization': `Basic ${encodedKey}`,
              'api-version': '2022-07-31',
              'Content-Type': 'application/json'
            }
          }
        );

        // Simpan xenditInvoiceId (di sini kita pakai ID QR Code) ke database
        newOrder = await prisma.order.update({
          where: { id: newOrder.id },
          data: { xenditInvoiceId: qrResponse.data.id },
          include: { items: true, user: { select: { name: true } } }
        });

        qrString = qrResponse.data.qr_string; // Ini yang akan dirender jadi gambar QR di frontend

        // Pancarkan event ke Pusher agar Customer Display otomatis menampilkan QR
        pusher.trigger('pos-channel', 'show-qris', {
          orderNumber: newOrder.orderNumber,
          totalAmount: Number(newOrder.totalAmount),
          qrString: qrString,
          timestamp: new Date().toISOString()
        }).catch(err => console.error('Pusher Error (Show QRIS):', err));

      } catch (error) {
        console.error('QR/Pusher Error:', error.response?.data || error);
        res.status(500);
        throw new Error(error.response?.data?.message || error.message || 'Gagal membuat QRIS.');
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order berhasil dibuat',
      data: {
        ...newOrder,
        qrString // Kirimkan qrString ke frontend jika ada
      }
    });

    // 6. JIKA CASH, PANICARKAN EVENT PUSHER KARENA LANGSUNG LUNAS
    if (paymentMethod === 'CASH') {
      pusher.trigger('pos-channel', 'order-paid', {
        orderNumber: newOrder.orderNumber,
        paymentMethod: newOrder.paymentMethod,
        totalAmount: Number(newOrder.totalAmount),
        timestamp: new Date().toISOString()
      }).catch(err => console.error('Pusher Error (CASH):', err));
    }

  } catch (error) {
    next(error);
  }
};

// [POST] /api/orders/:orderNumber/simulate-qris
const simulateQRIS = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;

    const order = await prisma.order.findUnique({
      where: { orderNumber }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    if (order.paymentMethod !== 'QRIS') {
      return res.status(400).json({ success: false, message: 'Order ini bukan QRIS' });
    }

    const encodedKey = Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64');
    
    const response = await axios.post(
      `https://api.xendit.co/qr_codes/${orderNumber}/payments/simulate`,
      { amount: Number(order.totalAmount) },
      {
        headers: {
          'Authorization': `Basic ${encodedKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Simulasi pembayaran berhasil dikirim ke Xendit. Silakan cek status order Anda.',
      xenditResponse: response.data
    });

  } catch (error) {
    console.error('Xendit Simulation Error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal melakukan simulasi pembayaran QRIS',
      error: error.response?.data || error.message
    });
  }
};

module.exports = {
  createOrder,
  simulateQRIS
};
