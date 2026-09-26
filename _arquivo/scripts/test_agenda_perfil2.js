import fetch from 'node-fetch';
async function test() {
  const res = await fetch('https://acordecrm.vercel.app/api/alunos/4194/agenda');
  const json = await res.json().catch(e => null);
  console.log(res.status, json ? Object.keys(json) : null);
}
test();
