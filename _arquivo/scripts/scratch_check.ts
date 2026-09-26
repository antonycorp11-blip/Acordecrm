import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function check() {
  const { data: profs } = await supabase.from('professores').select('*').ilike('nome', '%Vitória%');
  console.log("Professores:", profs?.map(p => ({id: p.id, nome: p.nome})));

  if (!profs || profs.length === 0) return;
  const profId = profs[0].id;

  const { data: aulas, error } = await supabase.from('aulas')
    .select('id, data, horario, status, aluno_id, alunos(nome, status)')
    .eq('professor_id', profId)
    .in('data', ['2026-05-16', '2026-05-23', '2026-05-18', '2026-05-25']) // Trying nearby dates just in case
    .order('data');
    
  console.log("Aulas no BD:", JSON.stringify(aulas, null, 2));
  console.log("Error:", error);
}

check();
