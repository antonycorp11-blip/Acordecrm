import fetch from 'node-fetch';
async function test() {
  const res = await fetch('https://acorde-crm.vercel.app/api/agenda');
  console.log('GET /api/agenda status:', res.status);
}
test();
