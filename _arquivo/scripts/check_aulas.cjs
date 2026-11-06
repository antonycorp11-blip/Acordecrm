require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { 'x-backend-secret': 'studio-acorde-secret-key-2024' } }
});

async function check() {
  const { data: prof, error: profErr } = await supabase.from('professores').select('*').limit(1).single();
  console.log("Professor:", prof.nome, "Valor aula:", prof.valor_aula);

  const { data: aulas, error } = await supabase.from('aulas')
    .select('id, data, status')
    .eq('professor_id', prof.id)
    .in('status', ['realizada', 'falta_aluno'])
    .order('data', { ascending: false })
    .limit(5);
  console.log("Aulas recentes:", aulas);
  console.log("Aulas err:", error);
}
check();
