require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { 'x-backend-secret': 'studio-acorde-secret-key-2024' } }
});

async function check() {
  const { data: prof } = await supabase.from('professores').select('*').limit(1).single();
  const now = new Date();
  const year = now.getFullYear();
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const currentMonthKey = `${year}-${monthStr}`;

  const sixMonthsAgo = new Date(year, now.getMonth() - 5, 1);
  const { data: todasAulas } = await supabase.from('aulas')
      .select('data, status')
      .eq('professor_id', prof.id)
      .gte('data', sixMonthsAgo.toISOString().split('T')[0]);

  const history = {};
  todasAulas.forEach(aula => {
      // Ignorar aulas desmarcadas ou faltas do professor
      if (['cancelada', 'falta_professor'].includes(aula.status)) return;
      const mKey = aula.data.substring(0, 7);
      history[mKey] = (history[mKey] || 0) + 1;
  });

  console.log("Current Month Key:", currentMonthKey);
  console.log("History:", history);
  console.log("Saldo calculated:", (history[currentMonthKey] || 0) * (Number(prof.valor_aula) || 0));
}
check();
