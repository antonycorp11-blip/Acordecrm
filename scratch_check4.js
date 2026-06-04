import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // USE SERVICE ROLE KEY!

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: aulas, error } = await supabase.from('aulas')
    .select('id, data, alunos(nome, status)')
    .limit(5);
  console.log("Aulas:", aulas);

  const { data: alunosNulos } = await supabase.from('alunos').select('id, nome, status').is('status', null);
  console.log("Alunos com status nulo:", alunosNulos?.length);
  
  const { data: alunosValidos } = await supabase.from('alunos').select('id, nome, status').not('status', 'is', null);
  console.log("Alunos com status valido:", alunosValidos?.length);
}

check();
