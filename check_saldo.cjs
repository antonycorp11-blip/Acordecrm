require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: { 'x-backend-secret': 'studio-acorde-secret-key-2024' }
  }
});

async function check() {
  const { data: profs } = await supabase.from('professores').select('id, nome, valor_por_aula').limit(1);
  if (!profs || profs.length === 0) return console.log("No profs");
  const prof = profs[0];

  const now = new Date();
  const year = now.getFullYear();
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const startOfMonth = `${year}-${monthStr}-01`;
  const endOfMonth = `${year}-${monthStr}-31`;

  console.log("Checking from", startOfMonth, "to", endOfMonth);
  
  const { data: aulasDoMes, error } = await supabase.from('aulas')
      .select('data, status')
      .eq('professor_id', prof.id)
      .in('status', ['realizada', 'falta_aluno'])
      .gte('data', startOfMonth)
      .lte('data', endOfMonth);

  if (error) console.error(error);
  
  const classesThisMonth = aulasDoMes ? aulasDoMes.length : 0;
  const valorPorAula = prof.valor_por_aula || 40;
  console.log(`Prof: ${prof.nome}, Valor: ${valorPorAula}, Aulas: ${classesThisMonth}, Saldo: ${classesThisMonth * valorPorAula}`);
  console.log("Aulas dadas:", aulasDoMes);
}
check();
