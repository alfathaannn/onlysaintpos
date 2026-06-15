const { Xendit } = require('xendit-node');
const x = new Xendit({secretKey: 'dummy'});
console.log(Object.keys(x));
