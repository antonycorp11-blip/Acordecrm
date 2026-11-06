const fs = require('fs');

let code = fs.readFileSync('api/index.ts', 'utf8');

// Find all places where sendPushNotification(titulo, mensagem); is called and replace them
// with a block that fetches the admin/prof and sends to them!

