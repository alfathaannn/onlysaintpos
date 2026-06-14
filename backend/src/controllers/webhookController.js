const prisma = require('../utils/prisma');
const pusher = require('../utils/pusher');

// [POST] /api/webhooks/xendit
// Endpoint ini hanya boleh dipanggil oleh server Xendit
const handleXenditWebhook = async (req, res, next) => {
  try {
    // 1. Verifikasi Token Webhook (Keamanan)
    // Xendit selalu mengirim header 'x-callback-token'
    const xenditToken = req.headers['x-callback-token'];
    
    if (xenditToken !== process.env.XENDIT_WEBHOOK_TOKEN) {
      console.warn('⚠️ Akses ditolak: Token Webhook tidak valid');
      return res.status(403).json({ success: false, message: 'Forbidden: Invalid Token' });
    }

    // 2. Ambil payload data dari Xendit
    // Data yang dikirim Xendit untuk QRIS biasanya berisi event, status, amount, dan qr_code.reference_id
    const payload = req.body;
    console.log('📬 Menerima Webhook dari Xendit:', JSON.stringify(payload, null, 2));

    // Xendit QRIS Webhook structure:
    // payload.event = 'qr.payment'
    // payload.data.status = 'COMPLETED'
    // payload.data.reference_id = 'ORD-20260614-123456'

    if (payload.event === 'qr.payment' && payload.data && payload.data.status === 'COMPLETED') {
      const orderNumber = payload.data.reference_id;

      // 3. Update status Order di database kita menjadi PAID
      // Menggunakan orderNumber untuk mencari Order-nya
      const updatedOrder = await prisma.order.update({
        where: { orderNumber: orderNumber },
        data: { status: 'PAID' }
      });

      console.log(`✅ Status pesanan ${orderNumber} berhasil diupdate menjadi PAID!`);

      // 4. Pancarkan event ke Pusher agar frontend tau
      pusher.trigger('pos-channel', 'order-paid', {
        orderNumber: updatedOrder.orderNumber,
        paymentMethod: updatedOrder.paymentMethod,
        totalAmount: Number(updatedOrder.totalAmount),
        timestamp: new Date().toISOString()
      }).catch(err => console.error('Pusher Error (QRIS):', err));

    } else {
      console.log('ℹ️ Webhook diabaikan karena bukan event qr.payment COMPLETED');
    }

    // 4. SELALU berikan response HTTP 200 ke Xendit
    // Jika tidak membalas 200, Xendit akan menganggap webhook gagal dan akan me-retry (mengirim ulang berkali-kali)
    res.status(200).json({ success: true, message: 'Webhook received' });

  } catch (error) {
    // Jika order tidak ditemukan, Prisma akan melempar error.
    // Kita harus tetap mengirimkan 200 ke Xendit agar tidak di-retry jika memang ordernya tidak ada di database kita
    console.error('❌ Gagal memproses Webhook Xendit:', error.message);
    res.status(200).json({ success: false, message: 'Failed to process webhook' });
  }
};

module.exports = {
  handleXenditWebhook
};
