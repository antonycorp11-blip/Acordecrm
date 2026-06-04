require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { 'x-backend-secret': 'studio-acorde-secret-key-2024' } }
});

async function check() {
  const { data: progresso } = await supabase.from('gamificacao_progresso').select('*');
  console.log("Total progresso na base:", progresso ? progresso.length : 0);
  
  const { data: aulasRealizadas } = await supabase.from('aulas').select('id, aluno_id, status').eq('status', 'realizada');
  console.log("Total aulas realizadas:", aulasRealizadas ? aulasRealizadas.length : 0);
}
check();
