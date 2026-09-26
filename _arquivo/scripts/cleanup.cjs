const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  global: { headers: { 'x-backend-secret': 'studio-acorde-secret-key-2024' } }
});

async function test() {
    await supabase.from('pagamentos').delete().eq('aluno_id', 4235);
    await supabase.from('aulas').delete().eq('aluno_id', 4235);
    await supabase.from('matriculas').delete().eq('aluno_id', 4235);
    await supabase.from('alunos').delete().eq('id', 4235);
    console.log("Cleaned up 4235");
}
test();
