const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: alunos, error } = await supabase
    .from('alunos')
    .select('*, matriculas(*, cursos(*))')
    .ilike('nome', '%Rafaela%');

  if (error) {
    console.error('Erro ao buscar:', error);
    return;
  }

  console.log('=== ALUNOS COM RAFAELA NO NOME ===');
  alunos.forEach(aluno => {
    console.log('--------------------------------');
    console.log('ID:', aluno.id);
    console.log('Nome:', aluno.nome);
    console.log('Telefone:', aluno.telefone);
    console.log('Email:', aluno.email);
    console.log('Matrículas:', JSON.stringify(aluno.matriculas, null, 2));
  });
}

run();
