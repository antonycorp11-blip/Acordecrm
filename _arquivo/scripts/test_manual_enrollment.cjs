require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log('Iniciando matrícula manual de teste para Eduardo Antonio...');

  // 1. Criar Aluno
  const { data: aluno, error: alErr } = await supabase.from('alunos').insert([{
    nome: 'EDUARDO ANTONIO (TESTE MANUAL)',
    email: 'eduardo.teste@gmail.com',
    status: 'ativo'
  }]).select().single();

  if (alErr) return console.error('Erro ao criar aluno:', alErr.message);
  console.log('Aluno criado:', aluno.nome);

  // 2. Criar Matrícula (Terças às 19h)
  const { data: matricula, error: matErr } = await supabase.from('matriculas').insert([{
    aluno_id: aluno.id,
    professor_id: 64, // Aquilles Santos
    curso_id: 11,     // Teclado White
    pacote_id: 1,
    dia_semana: 2,    // Terça-feira
    horario: '19:00:00',
    status: 'Ativa'
  }]).select().single();

  if (matErr) return console.error('Erro ao criar matrícula:', matErr.message);
  console.log('Matrícula criada para o dia da semana 2 (Terça)');

  // 3. Criar Aula de Hoje (28/04)
  const { data: aula, error: aulaErr } = await supabase.from('aulas').insert([{
    aluno_id: aluno.id,
    professor_id: 64,
    curso_id: 11,
    data: '2026-04-28',
    horario: '19:00:00',
    status: 'Pendente',
    tipo: 'Individual'
  }]).select().single();

  if (aulaErr) return console.error('Erro ao criar aula:', aulaErr.message);
  console.log('Aula de HOJE (28/04) às 19:00 criada com sucesso!');

  console.log('\n--- TESTE FINALIZADO ---');
  console.log('Por favor, abra a Agenda no dia de hoje e procure por Eduardo Antonio na linha do Prof. Aquilles.');
}

run();
