import fetch from 'node-fetch';
async function test() {
  const token = 'fake_not_needed_for_test_if_it_returns_401_we_know_but_lets_try';
  const res = await fetch('https://acorde-crm.vercel.app/api/alunos/4194/agenda');
  const json = await res.json().catch(e => null);
  console.log(res.status, json);
}
test();
