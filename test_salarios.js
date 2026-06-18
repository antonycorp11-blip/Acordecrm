import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const prevStartDate = '2026-06-01';
  const prevEndDate = '2026-06-30';

  const { data: aulasPrev, error: errAulas } = await supabase.from('aulas')
      .select('professor_id, status, professor:professor_id(nome)')
      .gte('data', prevStartDate)
      .lte('data', prevEndDate)
      .in('status', ['realizada', 'falta_aluno'])
      .not('professor_id', 'is', null);

  if (errAulas) console.error(errAulas);

  let aquillesCount = 0;
  let othersCount = 0;

  aulasPrev.forEach(a => {
      if (a.professor.nome.toLowerCase().includes('aquilles') || a.professor.nome.toLowerCase().includes('áquilles')) {
          aquillesCount++;
      } else {
          othersCount++;
      }
  });

  console.log(`Total Aulas Junho: ${aulasPrev.length}`);
  console.log(`Total Aquilles: ${aquillesCount} (R$ ${aquillesCount * 35})`);
  console.log(`Total Outros: ${othersCount} (R$ ${othersCount * 35})`);
  console.log(`Calculado no CRM: R$ ${aulasPrev.length * 35}`);
}
run();
