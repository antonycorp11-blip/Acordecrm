const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-backend-secret': 'studio-acorde-secret-key-2024'
    }
  }
});

async function test() {
    const { error } = await supabase.from('aulas').insert([{
        aluno_id: 4228, // use a fake or existing one
        matricula_id: 1,
        professor_id: 1,
        curso_id: 1,
        data: '2026-06-12',
        horario: '16:00',
        status: 'pendente',
        tipo: 'regular'
    }]);
    console.log("Error inserting duplicate:", error);
}
test();
