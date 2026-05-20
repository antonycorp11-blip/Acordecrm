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

function parseBirthDate(dateStr) {
  if (!dateStr || dateStr.trim() === "") return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

const studentsToMigrate = [
  {
    migracao_id: "d644a088-542e-41e1-b143-37d1dc198e9e",
    nome: "RICARDO GABRIEL DE ASSUNCAO",
    email: "",
    telefone: "(65) 98467-1831",
    cpf: "075.797.221-78",
    endereco: "Rua Cinqüenta e Oito, 9 Pedra 90 78099290 - Cuiabá - MT",
    data_nascimento: parseBirthDate("22/02/2001"),
    responsavel_nome: "",
    responsavel_telefone: "",
    responsavel_cpf: "",
    curso_id: 1, // Violão
    professor_id: 3, // Jonilson Nascimento
    dia_semana: 3, // Quarta-feira
    horario: "11:00",
    pacote_id: 5,
    aulas_restantes: 29,
    reposicoes: 11, // 11 reposições!
    faturas_pendentes: 3,
    faturas_atrasadas: 1, // 1 atrasada
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "6aa78d2b-9a42-45f0-b0c2-dcdb131aa01a",
    nome: "ROBSON SOLLES MENDES",
    email: "robinhosolles1@gmail.com",
    telefone: "(65) 99212-2361",
    cpf: "006.961.061-40",
    endereco: "Rua Catorze, 0 Pedra 90 78099070 - Cuiabá - MT",
    data_nascimento: parseBirthDate("20/10/1983"),
    responsavel_nome: "",
    responsavel_telefone: "",
    responsavel_cpf: "",
    curso_id: 4, // Bateria
    professor_id: 16, // Calebe Oliveira
    dia_semana: 6, // Sábado
    horario: "08:00",
    pacote_id: 5,
    aulas_restantes: 46,
    reposicoes: 0,
    faturas_pendentes: 11,
    faturas_atrasadas: 0,
    valor_parcela: 370,
    valor_desconto: 270,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "4dbb2232-6a9c-4711-bbfb-877ff2d75a51",
    nome: "RODRIGO SOUZA PINTO",
    email: "",
    telefone: "(11) 96477-6234",
    cpf: "320.951.708-81",
    endereco: "Rua Oito, 28, QUADRA 7B Residencial Claúdio Marchetti 78076319 - Cuiabá - MT",
    data_nascimento: parseBirthDate("27/05/1982"),
    responsavel_nome: "",
    responsavel_telefone: "",
    responsavel_cpf: "",
    curso_id: 7, // Técnica Vocal
    professor_id: 3, // Jonilson Nascimento
    dia_semana: 2, // Terça-feira
    horario: "09:00",
    pacote_id: 5,
    aulas_restantes: 19,
    reposicoes: 0,
    faturas_pendentes: 4,
    faturas_atrasadas: 0,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "10841a70-039b-4199-a217-845155718959",
    nome: "SAMARA CRISTINA DA MOTA SILVA",
    email: "samara12cristina@gmail.com",
    telefone: "(65) 99355-2345",
    cpf: "054.015.591-86",
    endereco: "Rua Catorze, 179, QUADRA 77 Pedra 90 78099070 - Cuiabá - MT",
    data_nascimento: parseBirthDate("15/12/1995"),
    responsavel_nome: "",
    responsavel_telefone: "",
    responsavel_cpf: "",
    curso_id: 7, // Técnica Vocal
    professor_id: 3, // Jonilson Nascimento
    dia_semana: 2, // Terça-feira
    horario: "10:00",
    pacote_id: 5,
    aulas_restantes: 31,
    reposicoes: 0,
    faturas_pendentes: 7,
    faturas_atrasadas: 0,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "f87de132-89ff-4747-8f1b-d6652528933d",
    nome: "SOFYA ANDRADE DE SOUZA",
    email: "flaviasofyaandrades2@gmail.com",
    telefone: "",
    cpf: null,
    endereco: "",
    data_nascimento: parseBirthDate("25/01/2014"),
    responsavel_nome: "FLAVIA SILVA DE ANDRADE",
    responsavel_telefone: "(65) 99275-7174",
    responsavel_cpf: "015.458.881-40",
    curso_id: 2, // Guitarra
    professor_id: 3, // Jonilson Nascimento
    dia_semana: 2, // Terça-feira
    horario: "19:00",
    pacote_id: 5,
    aulas_restantes: 36,
    reposicoes: 0,
    faturas_pendentes: 8,
    faturas_atrasadas: 0,
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
    telefone: student.telefone || null, 
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
      const day = 31 - i;
      reposToInsert.push({
        aluno_id: aluno.id,
        matricula_id: matricula.id,
        professor_id: student.professor_id,
        curso_id: student.curso_id,
        data: `2099-12-${day}`,
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

  // 5.1. Faturas Atrasadas
  if (student.faturas_atrasadas > 0) {
    for (let i = student.faturas_atrasadas - 1; i >= 0; i--) {
      const vencDate = new Date(now.getFullYear(), now.getMonth() - i, student.dia_vencimento);
      pagamentosToInsert.push({
        aluno_id: aluno.id,
        matricula_id: matricula.id,
        valor: student.valor_parcela,
        valor_com_desconto: student.valor_desconto,
        data_vencimento: formatLocalDateString(vencDate),
        status: 'atrasado',
        tipo_receita: 'mensalidade',
        referencia_mes_ano: `${String(vencDate.getMonth() + 1).padStart(2, '0')}/${vencDate.getFullYear()}`
      });
    }
  }

  // 5.2. Faturas Futuras
  const nFaturasFuturas = student.faturas_pendentes - student.faturas_atrasadas;
  if (nFaturasFuturas > 0) {
    for (let i = 1; i <= nFaturasFuturas; i++) {
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
