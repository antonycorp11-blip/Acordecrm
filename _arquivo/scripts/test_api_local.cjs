require('dotenv').config();
const http = require('http');

const req = http.request('http://localhost:3000/api/agenda', {
  method: 'GET',
  headers: {
    // Assuming we need auth, let's just make the request fail with 401 or see if the server is up
    'Authorization': 'Bearer test'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Data:', data.substring(0, 100)));
});
req.on('error', (e) => console.error(e));
req.end();
