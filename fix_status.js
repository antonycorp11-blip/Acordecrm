import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('aulas').select('id, status').eq('status', 'cancelada');
  console.log('Aulas canceladas:', data?.length || 0);
  
  if (data && data.length > 0) {
      await supabase.from('aulas').update({ status: 'falta' }).eq('status', 'cancelada');
      console.log('Atualizado para falta!');
  }
}
check();
