import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read env vars from .env file manually
const envPath = path.resolve('.env');
const envFile = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '';
let supabaseAnonKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('alunos')
    .update({ acorde_coins: 9999999 })
    .ilike('nome', '%jadna%')
    .select();

  if (error) console.error(error);
  else console.log('Updated:', data);
}
run();
