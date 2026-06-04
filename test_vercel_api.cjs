require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { 'x-backend-secret': 'studio-acorde-secret-key-2024' } }
});

async function check() {
  const { data: prog } = await supabase.from('gamificacao_progresso').select('aluno_id').limit(1);
  const { data: aluno } = await supabase.from('alunos').select('*').eq('id', prog[0].aluno_id).single();

  const token = jwt.sign(
        { email: aluno.email, role: 'aluno', name: aluno.nome },
        'studio-acorde-secret-key-2024',
        { expiresIn: '7d' }
  );
  
  const https = require('https');
  const makeReq = (path) => new Promise(resolve => {
      const req = https.request(`https://acordecrm.vercel.app${path}`, {
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
  console.log('Vercel ME Status:', res1.status, 'Data:', res1.data.substring(0, 200));
}
check();
