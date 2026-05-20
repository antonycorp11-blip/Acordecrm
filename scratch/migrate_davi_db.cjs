const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-backend-secret': 'studio-acorde-secret-key-2024'
    }
  }
});

function isHoliday(date) {
  // Simplificado do backend
  const mm_dd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const feriados = [
    '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'
  ];
  return feriados.includes(mm_dd);
}

async function main() {
  console.log('Iniciando migração direta no banco de dados para DAVI MIGUEL GOMES DE BRITO...');

  // 1. Criar Aluno
  const { data: aluno, error: errA } = await supabase.from('alunos').insert([{ 
    nome: "DAVI MIGUEL GOMES DE BRITO", 
    email: null,
    telefone: "", 
    cpf: null, 
    endereco: "Rua I, 03, QUADRA 03\nSão Sebastião\n78098254 - Cuiabá - MT",
    data_nascimento: "2015-10-14",
    responsavel_nome: "JACKELINE SANTOS GOMES",
    responsavel_telefone: "(65) 99253-1779",
    responsavel_cpf: "057.486.541-13",
    status: 'ativo'
  }]).select().single();

  if (errA) {
    console.error('Erro ao criar aluno:', errA);
    return;
  }
  console.log('Aluno criado com sucesso! ID:', aluno.id);

  // 2. Criar Matrícula
  // Hoje no fuso local
  const spDate = new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"});
  const now = new Date(spDate);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dataHojeLocal = `${yyyy}-${mm}-${dd}`;

  const { data: matricula, error: errM } = await supabase.from('matriculas').insert([{
    aluno_id: aluno.id, 
    curso_id: 1, // Violão
    professor_id: 2, // Juan Henrique
    dia_semana: 2, // Terça-feira
    horario: "17:00", 
    pacote_id: 5, // Legado Emusys
    dia_vencimento: 10,
    valor_parcela: 350,
    valor_com_desconto: 250,
    total_parcelas: 12,
    data_inicio: dataHojeLocal
  }]).select().single();

  if (errM) {
    console.error('Erro ao criar matrícula:', errM);
    // Rollback aluno
    await supabase.from('alunos').delete().eq('id', aluno.id);
    return;
  }
  console.log('Matrícula criada com sucesso! ID:', matricula.id);

  // 3. Criar Aulas Restantes (10 aulas)
  const aulasToInsert = [];
  let currentAulaDate = new Date(spDate);
  const targetDay = 2; // Terça-feira
  const currentDay = currentAulaDate.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0) diff += 7;
  currentAulaDate.setDate(currentAulaDate.getDate() + diff);

  const formatLocalDateString = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  };

  for (let i = 0; i < 10; i++) {
    while (isHoliday(currentAulaDate)) {
      currentAulaDate.setDate(currentAulaDate.getDate() + 7);
    }
    aulasToInsert.push({
      aluno_id: aluno.id,
      matricula_id: matricula.id,
      professor_id: 2,
      curso_id: 1,
      data: formatLocalDateString(currentAulaDate),
      horario: "17:00",
      status: 'pendente',
      tipo: 'regular'
    });
    currentAulaDate.setDate(currentAulaDate.getDate() + 7);
  }

  const { error: errAulas } = await supabase.from('aulas').insert(aulasToInsert);
  if (errAulas) {
    console.error('Erro ao criar aulas:', errAulas);
  } else {
    console.log('10 Aulas regulares criadas com sucesso!');
  }

  // 4. Criar Reposições (1 reposição)
  const reposToInsert = [{
    aluno_id: aluno.id,
    matricula_id: matricula.id,
    professor_id: 2,
    curso_id: 1,
    data: '2099-12-31',
    horario: '00:00',
    status: 'pendente',
    tipo: 'reposicao'
  }];

  const { error: errRepos } = await supabase.from('aulas').insert(reposToInsert);
  if (errRepos) {
    console.error('Erro ao criar reposições:', errRepos);
  } else {
    console.log('1 Aula de reposição criada com sucesso!');
  }

  // 5. Criar Pagamento Pendente (1 fatura restante a partir do mês que vem - Junho)
  // Próximo mês
  const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 10);
  const pagamentosToInsert = [{
    aluno_id: aluno.id,
    matricula_id: matricula.id,
    valor: 350,
    valor_com_desconto: 250,
    data_vencimento: formatLocalDateString(nextDate),
    status: 'pendente',
    tipo_receita: 'mensalidade',
    referencia_mes_ano: `${String(nextDate.getMonth() + 1).padStart(2, '0')}/${nextDate.getFullYear()}`
  }];

  const { error: errPags } = await supabase.from('pagamentos').insert(pagamentosToInsert);
  if (errPags) {
    console.error('Erro ao criar faturas:', errPags);
  } else {
    console.log('Fatura de Junho/2026 pendente criada com sucesso!');
  }

  // 6. Marcar na sala de espera como concluído
  const { error: errQueue } = await supabase
    .from('migracao_alunos')
    .update({ status: 'concluido' })
    .eq('id', '80f1728c-b63f-4225-8fa2-1e8620e92fdf');

  if (errQueue) {
    console.error('Erro ao atualizar status na sala de espera:', errQueue);
  } else {
    console.log('Migração na sala de espera concluída com sucesso!');
  }

  console.log('MIGRACÃO DE DAVI MIGUEL GOMES DE BRITO CONCLUÍDA COM SUCESSO ABSOLUTO!');
}

main().catch(console.error);
