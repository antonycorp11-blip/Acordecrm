require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { 'x-backend-secret': 'studio-acorde-secret-key-2024' } }
});

async function check() {
  const { data: aulas, error } = await supabase.from('aulas')
    .select('id, data, status, professor:professor_id(nome, valor_aula)')
    .in('status', ['realizada', 'falta_aluno'])
    .order('data', { ascending: false })
    .limit(10);
  console.log("Aulas err:", error);
  console.log("Aulas recentes:", JSON.stringify(aulas, null, 2));
}
check();
