const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function test() {
    const start = '2026-04-28';
    console.log('Testando filtro GTE para data:', start);
    
    const { data, error } = await supabase
        .from('aulas')
        .select('id, data, aluno_id')
        .gte('data', start)
        .limit(5);
        
    if (error) {
        console.error('Erro:', error);
        return;
    }
    
    console.log('Resultados encontrados:', data.length);
    data.forEach(a => console.log(`ID: ${a.id}, Data: ${a.data}`));
}

test();
