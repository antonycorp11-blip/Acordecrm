import fetch from 'node-fetch';
const res = await fetch('https://acorde-crm.vercel.app/api/agenda');
console.log(res.status);
