const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
    const { data, error } = await supabase.from('alunos').insert([{
        nome: 'ANNY GABRIELY DA SILVA ESPINA',
        data_nascimento: '2017-11-30',
        telefone: null,
        cpf: null,
        email: null,
        endereco: 'RUA QUATORZE QUADRA 25 CASA 24 - RES SAL',
        responsavel_nome: 'CICERO LEONEL DE LIMA',
        responsavel_cpf: '58306734153',
        responsavel_telefone: '65992170088'
    }]);
    console.log("Error:", error);
}
test();
