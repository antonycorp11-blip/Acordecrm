require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: fixas, error } = await supabase.from('despesas').select('*').eq('categoria', 'fixa');
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(`Found ${fixas.length} fixed expenses.`);
  
  const novasParaInserir = [];
  
  for (const d of fixas) {
    let currentDate = new Date(d.data_vencimento + 'T12:00:00');
    
    for (let i = 1; i <= 11; i++) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        const nextDateStr = currentDate.toISOString().split('T')[0];
        
        const { data: existe } = await supabase.from('despesas')
           .select('id')
           .eq('descricao', d.descricao)
           .eq('data_vencimento', nextDateStr);
           
        if (!existe || existe.length === 0) {
            novasParaInserir.push({
                descricao: d.descricao,
                valor: d.valor,
                data_vencimento: nextDateStr,
                categoria: 'fixa',
                tipo_recorrencia: 'mensal',
                professor_id: d.professor_id,
                status: 'pendente'
            });
            console.log(`Will create clone for ${d.descricao} on ${nextDateStr}`);
        }
    }
  }
  
  if (novasParaInserir.length > 0) {
    const { error: insErr } = await supabase.from('despesas').insert(novasParaInserir);
    if (insErr) console.error("Error inserting:", insErr);
    else console.log(`Successfully inserted ${novasParaInserir.length} clones.`);
  } else {
    console.log("No clones needed.");
  }
}

run();
