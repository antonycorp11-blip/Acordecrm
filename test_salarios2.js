import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: aulasPrev, error: errAulas } = await supabase.from('aulas')
      .select('professor_id, status, data, professor:professores(nome)')
      .in('status', ['realizada', 'falta_aluno'])
      .not('professor_id', 'is', null);

  if (errAulas) console.error(errAulas);

  let aquillesCount = 0;
  let othersCount = 0;

  aulasPrev.forEach(a => {
      const isAquilles = a.professor && (a.professor.nome.toLowerCase().includes('aquilles') || a.professor.nome.toLowerCase().includes('áquilles'));
      if (isAquilles) aquillesCount++;
      else othersCount++;
  });

  console.log(`Total Aulas Realizadas GERAL: ${aulasPrev.length}`);
  console.log(`Total Aquilles: ${aquillesCount}`);
  console.log(`Total Outros: ${othersCount}`);
  console.log(aulasPrev.slice(0, 5));
}
run();
