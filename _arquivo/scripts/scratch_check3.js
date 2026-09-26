import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function check() {
  const { data: aulas, error } = await supabase.from('aulas')
    .select('id, alunos!inner(status)')
    .neq('alunos.status', 'arquivado')
    .limit(10);
  console.log("Com !inner:", aulas?.length, "Error:", error);

  const { data: aulas2, error: err2 } = await supabase.from('aulas')
    .select('id, alunos(status)')
    .limit(10);
  console.log("Sem !inner:", aulas2?.length, "Error:", err2);
}

check();
