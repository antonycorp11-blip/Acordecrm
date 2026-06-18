import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: prof } = await supabase.from('professores').select('id').ilike('nome', '%juan%').single();
  if(!prof) { console.log('Juan not found'); return; }
  const { data: aulas } = await supabase.from('aulas').select('data, status').eq('professor_id', prof.id).in('status', ['realizada', 'falta_aluno']);
  console.log(`Aulas Juan: ${aulas.length}`);
  console.log(aulas);
}
run();
