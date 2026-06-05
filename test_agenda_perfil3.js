import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 's3cr3t_f0r_t3st1ng_0nlY_v3ry_l0ng_stR1ng';
const token = jwt.sign({ id: '25', email: 'aquilles1213@gmail.com', role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });

async function test() {
  const res = await fetch('https://acordecrm.vercel.app/api/alunos/4194/agenda', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const json = await res.json().catch(e => null);
  console.log(res.status);
  console.log(json.map(a => a.status));
}
test();
