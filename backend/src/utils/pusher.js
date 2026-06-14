const Pusher = require('pusher');

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || 'dummy_app_id',
  key: process.env.PUSHER_KEY || 'dummy_key',
  secret: process.env.PUSHER_SECRET || 'dummy_secret',
  cluster: process.env.PUSHER_CLUSTER || 'ap1',
  useTLS: true
});

module.exports = pusher;
