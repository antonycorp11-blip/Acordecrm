require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-backend-secret': process.env.JWT_SECRET || 'studio-acorde-secret-key-2024'
    }
  }
});

async function run() {
    const { data, error } = await supabase
        .from('pagamentos')
        .select('*, aluno:aluno_id!inner(nome, status, matriculas(id, status, valor_com_desconto))')
        .neq('aluno.status', 'arquivado')
        .limit(1);
    
    console.log(JSON.stringify(data, null, 2));
}
run();
