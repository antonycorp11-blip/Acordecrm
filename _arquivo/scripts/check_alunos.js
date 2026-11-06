import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: alunos, error: err1 } = await supabase.from('alunos').select('id, nome');
  console.log("Alunos:", alunos?.map(a => a.nome));
}
check();
