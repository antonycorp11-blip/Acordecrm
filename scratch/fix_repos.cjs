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
  // Enzo Gabriel Nery Marques (aluno_id: 4179, matricula_id: 27)
  // Tem 4 reposições.
  console.log("Inserindo reposições para Enzo Gabriel Nery Marques...");
  const reposEnzo = [];
  for (let i = 0; i < 4; i++) {
    const day = 31 - i;
    reposEnzo.push({
      aluno_id: 4179,
      matricula_id: 27,
      professor_id: 16,
      curso_id: 4,
      data: `2099-12-${day}`,
      horario: '00:00',
      status: 'pendente',
      tipo: 'reposicao'
    });
  }
  const { error: errEnzo } = await supabase.from('aulas').insert(reposEnzo);
  if (errEnzo) console.error("Erro ao criar reposições do Enzo:", errEnzo);
  else console.log("Reposições do Enzo criadas com sucesso!");

  // Erica Milena Da Silva (aluno_id: 4181, matricula_id: 29)
  // Tem 8 reposições.
  console.log("Inserindo reposições para Erica Milena Da Silva...");
  const reposErica = [];
  for (let i = 0; i < 8; i++) {
    const day = 31 - i;
    reposErica.push({
      aluno_id: 4181,
      matricula_id: 29,
      professor_id: 1,
      curso_id: 3,
      data: `2099-12-${day}`,
      horario: '00:00',
      status: 'pendente',
      tipo: 'reposicao'
    });
  }
  const { error: errErica } = await supabase.from('aulas').insert(reposErica);
  if (errErica) console.error("Erro ao criar reposições da Erica:", errErica);
  else console.log("Reposições da Erica criadas com sucesso!");
}

main();
