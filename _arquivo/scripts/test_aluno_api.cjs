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
        process.env.VITE_JWT_SECRET || 'acorde-secret-key-2024',
        { expiresIn: '7d' }
  );
  console.log("Token:", token);
  
  const http = require('http');
  const req = http.request('http://localhost:3000/api/alunos/me', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Status ME:', res.statusCode, 'Data:', data.substring(0, 200)));
  });
  req.on('error', (e) => console.error(e));
  req.end();
}
check();
