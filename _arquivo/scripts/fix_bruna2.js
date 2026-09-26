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
  const { data: alunos } = await supabase.from('alunos').select('id, nome, xp, acorde_coins').ilike('nome', '%bruna gama%');
  if (!alunos || alunos.length === 0) { console.log('Bruna not found'); return; }
  
  const bruna = alunos[0];
  console.log(`Found: ${bruna.nome} | XP: ${bruna.xp} | Coins: ${bruna.acorde_coins}`);
  
  const newCoins = (bruna.acorde_coins || 0) + 4000;
  const newXp = Math.max(0, (bruna.xp || 0) - 3000);
  
  const { error } = await supabase.from('alunos').update({
     acorde_coins: newCoins,
     xp: newXp
  }).eq('id', bruna.id);
  
  if (error) { console.log(error); }
  else { console.log(`Updated! New XP: ${newXp} | New Coins: ${newCoins}`); }
}
run();
