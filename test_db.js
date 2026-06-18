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
  console.log("Checking feed_atividades...");
  const { data: feed, error: feedError } = await supabase.from('feed_atividades').select('*');
  console.log("Feed:", feed ? feed.length : "Error:", feedError);

  console.log("Checking alunos...");
  const { data: alunos, error: alunosError } = await supabase.from('alunos').select('id, nome, xp, acorde_coins').eq('id', 4183).single();
  console.log("Aluno 4183:", alunos, "Error:", alunosError);
}

run();
