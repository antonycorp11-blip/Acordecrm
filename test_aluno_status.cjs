require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { 'x-backend-secret': 'studio-acorde-secret-key-2024' } }
});

async function check() {
  const { data: aluno } = await supabase.from('alunos').select('id, email, nome').eq('status', 'ativo').limit(1).single();
  const { data: aulas } = await supabase.from('aulas').select('status').eq('aluno_id', aluno.id);
  const statusSet = [...new Set(aulas.map(a => a.status))];
  console.log("Statuses for aluno:", statusSet);
  console.log("Total aulas:", aulas.length);
}
check();
