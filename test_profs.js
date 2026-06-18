import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: profs } = await supabase.from('professores').select('id, nome');
  const { data: aulas } = await supabase.from('aulas').select('data, status, professor_id').in('status', ['realizada', 'falta_aluno']);
  
  for(const p of profs) {
     const pAulas = aulas.filter(a => a.professor_id === p.id);
     console.log(`${p.nome}: ${pAulas.length} aulas. Dates: ${pAulas.map(a => a.data).join(', ')}`);
  }
}
run();
