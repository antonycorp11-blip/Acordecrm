import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function check() {
  const { data: aulas } = await supabase.from('aulas')
    .select('id, data, horario, status, aluno_id, professor_id, alunos(nome), professores(nome)')
    .eq('data', '2026-05-23');
  console.log("Aulas dia 23:");
  aulas?.forEach(a => console.log(`Aula: ${a.id} | Prof: ${a.professores?.nome} (ID: ${a.professor_id}) | Aluno: ${a.alunos?.nome}`));
}

check();
