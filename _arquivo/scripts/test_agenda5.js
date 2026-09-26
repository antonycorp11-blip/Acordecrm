import fetch from 'node-fetch';
async function test() {
  const res = await fetch('https://acordecrm.vercel.app/api/ping');
  const text = await res.text();
  console.log('GET /api/ping status:', res.status, text);
}
test();
