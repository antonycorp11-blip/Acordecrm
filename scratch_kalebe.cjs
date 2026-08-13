const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://saojbwipdxebibjmtxqc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhb2pid2lwZHhlYmliam10eHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzcxODMsImV4cCI6MjA4NDE1MzE4M30.X9FmXtsbqGg1N-2z6UVSW7PoZmC7vK2K-HNsLLbRpNA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Searching for Kalebe...");
  const { data: alunos, error } = await supabase
    .from('alunos')
    .select('*')
    .ilike('nome', '%Kalebe%');

  if (error) {
    console.error('Error fetching aluno:', error);
    return;
  }
  
  console.log('Alunos found:', alunos.length);
  alunos.forEach(a => console.log(`- ${a.id}: ${a.nome}`));

  if (alunos.length === 0) return;

  const alunoId = alunos[0].id;
  
  // Also check "matriculas" for this student
  const { data: matriculas, error: matError } = await supabase
    .from('matriculas')
    .select('*')
    .eq('aluno_id', alunoId);

  if (matError) {
    console.error('Error fetching matriculas:', matError);
  } else {
    console.log('Matriculas found for aluno:', matriculas);
  }

  // Fetch agenda
  const { data: agenda, error: agendaError } = await supabase
    .from('agenda')
    .select('*')
    .eq('aluno_id', alunoId)
    .order('data_hora', { ascending: true });

  if (agendaError) {
    console.error('Error fetching agenda:', agendaError);
  } else {
    console.log('Total agenda items for this aluno:', agenda.length);
    console.log('Agenda items:');
    agenda.forEach(item => {
        console.log(`- ID: ${item.id} | Data: ${item.data_hora} | Status: ${item.status} | Deleteado em: ${item.deleted_at || 'null'} | Cancelado: ${item.cancelado}`);
    });
  }
}
run();
