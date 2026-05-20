import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-backend-secret': 'studio-acorde-secret-key-2024'
    }
  }
});

async function run() {
  const { data: users, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, role');

  if (error) {
    console.error(error);
    return;
  }

  console.log(JSON.stringify(users, null, 2));
}

run();
