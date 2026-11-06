import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: aulas } = await supabase.from('aulas').select('data, status').gte('data', '2026-05-01').lte('data', '2026-05-31');
  console.log(`Total classes in May: ${aulas.length}`);
  const realizadas = aulas.filter(a => a.status === 'realizada' || a.status === 'falta_aluno');
  console.log(`Realizadas in May: ${realizadas.length}`);
}
run();
