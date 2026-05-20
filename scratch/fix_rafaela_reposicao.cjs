const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-backend-secret': 'studio-acorde-secret-key-2024'
    }
  }
});

async function main() {
  const alunoId = 4206; // Rafaela Marques
  const matriculaId = 55; // Violão Laranja
  const professorId = 1;
  const cursoId = 1;

  // Inserir a reposição no dia 2099-12-30
  const { data, error } = await supabase
    .from('aulas')
    .insert([{
      aluno_id: alunoId,
      matricula_id: matriculaId,
      professor_id: professorId,
      curso_id: cursoId,
      data: '2099-12-30',
      horario: '00:00',
      status: 'pendente',
      tipo: 'reposicao'
    }])
    .select();

  if (error) {
    console.error("Erro ao inserir reposição corrigida da Rafaela:", error);
  } else {
    console.log("Reposição da Rafaela inserida com sucesso no dia 2099-12-30!", data);
  }
}

main();
