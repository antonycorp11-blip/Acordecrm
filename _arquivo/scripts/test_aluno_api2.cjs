require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { 'x-backend-secret': 'studio-acorde-secret-key-2024' } }
});

async function check() {
  const { data: aluno } = await supabase.from('alunos').select('email, nome').eq('status', 'ativo').limit(1).single();
  const token = jwt.sign(
        { email: aluno.email, role: 'aluno', name: aluno.nome },
        'studio-acorde-secret-key-2024',
        { expiresIn: '7d' }
  );
  
  const http = require('http');
  
  const makeReq = (path) => new Promise(resolve => {
      const req = http.request(`http://localhost:3000${path}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', (e) => resolve({ status: 500, error: e.message }));
      req.end();
  });

  const res1 = await makeReq('/api/alunos/me');
  console.log('Status ME:', res1.status, 'Data:', res1.data.substring(0, 100));

  const res2 = await makeReq('/api/agenda');
  console.log('Status AGENDA:', res2.status, 'Data:', res2.data.substring(0, 100));
}
check();
