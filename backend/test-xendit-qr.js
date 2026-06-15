require('dotenv').config();
const axios = require('axios');

async function testQR() {
  try {
    const encodedKey = Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64');
    const qrResponse = await axios.post(
      'https://api.xendit.co/qr_codes',
      {
        reference_id: 'TEST-' + Date.now(),
        type: 'DYNAMIC',
        currency: 'IDR',
        amount: 50000
      },
      {
        headers: {
          'Authorization': `Basic ${encodedKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log("SUCCESS:", qrResponse.data);
  } catch (error) {
    console.log("ERROR:", JSON.stringify(error.response?.data, null, 2));
  }
}

testQR();
