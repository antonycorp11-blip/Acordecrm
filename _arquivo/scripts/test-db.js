import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.rpc('get_column_info', {}); // likely not exists
  // instead let's just try to update all rows
  // To check if acorde_coins exists, we can do a select:
  const res = await supabase.from('alunos').select('acorde_coins').limit(1);
  console.log(res);
}
run();
