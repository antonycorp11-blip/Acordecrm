import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: aulas } = await supabase.from('aulas').select('data, status').order('data', { ascending: true });
  console.log(`Total classes: ${aulas.length}`);
  if (aulas.length > 0) {
     console.log(`First class date: ${aulas[0].data}`);
     console.log(`Last class date: ${aulas[aulas.length - 1].data}`);
     
     const july = aulas.filter(a => a.data.startsWith('2026-07') && ['realizada', 'falta_aluno'].includes(a.status));
     console.log(`Realizadas in July: ${july.length}`);
     
     const june = aulas.filter(a => a.data.startsWith('2026-06') && ['realizada', 'falta_aluno'].includes(a.status));
     console.log(`Realizadas in June: ${june.length}`);
     
     const august = aulas.filter(a => a.data.startsWith('2026-08') && ['realizada', 'falta_aluno'].includes(a.status));
     console.log(`Realizadas in August: ${august.length}`);
  }
}
run();
