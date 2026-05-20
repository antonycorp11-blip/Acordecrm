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
  const mm_dd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const feriados = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'];
  return feriados.includes(mm_dd);
}

const formatLocalDateString = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dt = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dt}`;
};

const studentsToMigrate = [
  {
    migracao_id: "06ef119c-1f07-483d-a350-47d8c9c7ef9a",
    nome: "ELOIZA MARIA ALVES RAMOS",
    email: "elaizeramos@gmail.com",
    telefone: "(65) 99337-6974",
    cpf: null,
    endereco: "Cuiabá - MT",
    data_nascimento: "2012-05-21",
    responsavel_nome: "ELAIZE MARIA RAMOS ALVES",
    responsavel_telefone: "(65) 99337-6974",
    responsavel_cpf: "018.708.571-43",
    curso_id: 3, // Teclado
    professor_id: 1, // Aquilles Antony
    dia_semana: 6, // Sábado
    horario: "13:00",
    pacote_id: 5,
    aulas_restantes: 44,
    reposicoes: 0,
    faturas_pendentes: 11,
    fatura_mes_atraso: false,
    valor_parcela: 370,
    valor_desconto: 270,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "6ed548c2-2be8-4ecf-a4d1-6763664353d4",
    nome: "ENZO GABRIEL NERY MARQUES",
    email: "",
    telefone: "",
    cpf: null,
    endereco: "Rua Vinte e Dois, 6, QUADRA 7 Pedra 90 78099110 - Cuiabá - MT",
    data_nascimento: "2017-07-11",
    responsavel_nome: "KATIANE NERY LOPES MARQUES",
    responsavel_telefone: "(65) 99919-3098",
    responsavel_cpf: "032.704.181-16",
    curso_id: 4, // Bateria
    professor_id: 16, // Kalebe Oliveira
    dia_semana: 6, // Sábado
    horario: "11:00",
    pacote_id: 5,
    aulas_restantes: 21,
    reposicoes: 4,
    faturas_pendentes: 2,
    fatura_mes_atraso: false,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "a5df8657-790f-4040-9e3c-cb68e888fd02",
    nome: "ENZO RAFAEL OLIVEIRA DA SILVA",
    email: "",
    telefone: "",
    cpf: null,
    endereco: "Cuiabá - MT",
    data_nascimento: "2016-02-25",
    responsavel_nome: "VALDIRENE OLIVEIRA DOS SANTOS",
    responsavel_telefone: "(65) 99216-2359",
    responsavel_cpf: "035.809.011-33",
    curso_id: 4, // Bateria
    professor_id: 16, // Kalebe Oliveira
    dia_semana: 4, // Quinta-feira
    horario: "18:00",
    pacote_id: 5,
    aulas_restantes: 31,
    reposicoes: 1,
    faturas_pendentes: 6,
    fatura_mes_atraso: false,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "b738def8-a932-426a-a72d-c9a2009cabce",
    nome: "ERICA MILENA DA SILVA",
    email: "",
    telefone: "(65) 98424-0297",
    cpf: "072.659.881-08",
    endereco: "RUA 07, 14, QUADRA 38 BRASIL 21 7800000 - Cuiabá - MT",
    data_nascimento: "2002-08-30",
    responsavel_nome: "",
    responsavel_telefone: "",
    responsavel_cpf: "",
    curso_id: 3, // Teclado
    professor_id: 1, // Aquilles Antony
    dia_semana: 6, // Sábado
    horario: "10:00",
    pacote_id: 5,
    aulas_restantes: 23,
    reposicoes: 8,
    faturas_pendentes: 1,
    fatura_mes_atraso: false,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "3e7cf43d-97f8-4a1e-8b3b-238de35155d2",
    nome: "GUILHERME NUNES BARBOSA",
    email: "silvanaanunes648@gmail.com",
    telefone: "(65) 98151-7532",
    cpf: null,
    endereco: "Cuiabá - MT",
    data_nascimento: "2009-12-02",
    responsavel_nome: "SILVANA NUNES XAVIER",
    responsavel_telefone: "(65) 98151-7532",
    responsavel_cpf: "013.654.171-23",
    curso_id: 3, // Teclado
    professor_id: 1, // Aquilles Antony
    dia_semana: 3, // Quarta-feira
    horario: "18:00",
    pacote_id: 5,
    aulas_restantes: 36,
    reposicoes: 0,
    faturas_pendentes: 8,
    fatura_mes_atraso: false,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  }
];

async function migrateOne(student) {
  console.log(`\n>>> Migrando aluno: ${student.nome}...`);

  // 1. Criar Aluno
  const { data: aluno, error: errA } = await supabase.from('alunos').insert([{ 
    nome: student.nome, 
    email: student.email && student.email.trim() !== '' ? student.email : null,
    telefone: student.telefone, 
    cpf: student.cpf, 
    endereco: student.endereco,
    data_nascimento: student.data_nascimento,
    responsavel_nome: student.responsavel_nome || null,
    responsavel_telefone: student.responsavel_telefone || null,
    responsavel_cpf: student.responsavel_cpf || null,
    status: 'ativo'
  }]).select().single();

  if (errA) {
    console.error(`[-] Erro ao criar aluno ${student.nome}:`, errA);
    return;
  }
  console.log(`[+] Aluno criado! ID: ${aluno.id}`);

  // 2. Criar Matrícula
  const spDate = new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"});
  const now = new Date(spDate);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dataHojeLocal = `${yyyy}-${mm}-${dd}`;

  const { data: matricula, error: errM } = await supabase.from('matriculas').insert([{
    aluno_id: aluno.id, 
    curso_id: student.curso_id, 
    professor_id: student.professor_id, 
    dia_semana: student.dia_semana, 
    horario: student.horario, 
    pacote_id: student.pacote_id, 
    dia_vencimento: student.dia_vencimento,
    valor_parcela: student.valor_parcela,
    valor_com_desconto: student.valor_desconto,
    total_parcelas: student.total_parcelas,
    data_inicio: dataHojeLocal
  }]).select().single();

  if (errM) {
    console.error(`[-] Erro ao criar matrícula para ${student.nome}:`, errM);
    await supabase.from('alunos').delete().eq('id', aluno.id);
    return;
  }
  console.log(`[+] Matrícula criada! ID: ${matricula.id}`);

  // 3. Criar Aulas Restantes
  const nAulas = student.aulas_restantes;
  if (nAulas > 0) {
    const aulasToInsert = [];
    let currentAulaDate = new Date(spDate);
    const targetDay = student.dia_semana;
    const currentDay = currentAulaDate.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    currentAulaDate.setDate(currentAulaDate.getDate() + diff);

    for (let i = 0; i < nAulas; i++) {
      while (isHoliday(currentAulaDate)) {
        currentAulaDate.setDate(currentAulaDate.getDate() + 7);
      }
      aulasToInsert.push({
        aluno_id: aluno.id,
        matricula_id: matricula.id,
        professor_id: student.professor_id,
        curso_id: student.curso_id,
        data: formatLocalDateString(currentAulaDate),
        horario: student.horario,
        status: 'pendente',
        tipo: 'regular'
      });
      currentAulaDate.setDate(currentAulaDate.getDate() + 7);
    }
    const { error: errAulas } = await supabase.from('aulas').insert(aulasToInsert);
    if (errAulas) console.error(`[-] Erro ao criar aulas:`, errAulas);
    else console.log(`[+] ${nAulas} Aulas regulares geradas!`);
  }

  // 4. Criar Reposições
  const nRepos = student.reposicoes;
  if (nRepos > 0) {
    const reposToInsert = [];
    for (let i = 0; i < nRepos; i++) {
      reposToInsert.push({
        aluno_id: aluno.id,
        matricula_id: matricula.id,
        professor_id: student.professor_id,
        curso_id: student.curso_id,
        data: '2099-12-31',
        horario: '00:00',
        status: 'pendente',
        tipo: 'reposicao'
      });
    }
    const { error: errRepos } = await supabase.from('aulas').insert(reposToInsert);
    if (errRepos) console.error(`[-] Erro ao criar reposições:`, errRepos);
    else console.log(`[+] ${nRepos} Aula(s) de reposição gerada(s)!`);
  }

  // 5. Geração de Pagamentos
  const pagamentosToInsert = [];
  const vencimentoMesAtual = new Date(now.getFullYear(), now.getMonth(), student.dia_vencimento);

  // 5.1. Parcela Atrasada do Mês Atual (se houver)
  if (student.fatura_mes_atraso) {
    pagamentosToInsert.push({
      aluno_id: aluno.id,
      matricula_id: matricula.id,
      valor: student.valor_parcela,
      valor_com_desconto: student.valor_desconto,
      data_vencimento: formatLocalDateString(vencimentoMesAtual),
      status: (vencimentoMesAtual < now) ? 'atrasado' : 'pendente',
      tipo_receita: 'mensalidade',
      referencia_mes_ano: `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`
    });
  }

  // 5.2. Parcelas Restantes
  const nFaturas = student.faturas_pendentes;
  if (nFaturas > 0) {
    for (let i = 1; i <= nFaturas; i++) {
      const nextDate = new Date(now.getFullYear(), now.getMonth() + i, student.dia_vencimento);
      pagamentosToInsert.push({
        aluno_id: aluno.id,
        matricula_id: matricula.id,
        valor: student.valor_parcela,
        valor_com_desconto: student.valor_desconto,
        data_vencimento: formatLocalDateString(nextDate),
        status: 'pendente',
        tipo_receita: 'mensalidade',
        referencia_mes_ano: `${String(nextDate.getMonth() + 1).padStart(2, '0')}/${nextDate.getFullYear()}`
      });
    }
  }

  if (pagamentosToInsert.length > 0) {
    const { error: errPags } = await supabase.from('pagamentos').insert(pagamentosToInsert);
    if (errPags) console.error(`[-] Erro ao criar faturas:`, errPags);
    else console.log(`[+] ${pagamentosToInsert.length} Lançamento(s) financeiro(s) gerado(s)!`);
  }

  // 6. Marcar como concluído na sala de espera
  const { error: errQueue } = await supabase
    .from('migracao_alunos')
    .update({ status: 'concluido' })
    .eq('id', student.migracao_id);

  if (errQueue) console.error(`[-] Erro ao atualizar status na fila:`, errQueue);
  else console.log(`[+] Status da migração definido como Concluído!`);

  console.log(`[✔] MIGRACÃO DE ${student.nome} FINALIZADA COM SUCESSO!`);
}

async function main() {
  for (const student of studentsToMigrate) {
    await migrateOne(student);
  }
}

main().catch(console.error);
