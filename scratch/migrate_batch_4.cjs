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
    migracao_id: "b1b40d8f-bfbd-42e6-9f50-9c228fb8929c",
    nome: "JOÃO HENRIQUE SOUZA MAGALHÃES",
    email: "",
    telefone: "",
    cpf: null,
    endereco: "Rua Quatro, 23 Pedra 90 78099020 - Cuiabá - MT",
    data_nascimento: "2012-03-18",
    responsavel_nome: "KELLY KETELLYN",
    responsavel_telefone: "(65) 99249-5044",
    responsavel_cpf: "042.306.171-27",
    curso_id: 1, // Guitarra
    professor_id: 2, // Juan Henrique
    dia_semana: 4, // Quinta-feira
    horario: "18:00",
    pacote_id: 5,
    aulas_restantes: 12,
    reposicoes: 2,
    faturas_pendentes: 1,
    fatura_mes_atraso: false,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "40bb10e0-aa5f-4fa1-9e07-a11de442cd71",
    nome: "JULIA SOUZA COELHO",
    email: "rccassinha@hotmail.com",
    telefone: "",
    cpf: null,
    endereco: "Rua Z, 24, QUADRA 18 Distrito Industrial 78098900 - Cuiabá - MT",
    data_nascimento: "2011-05-03",
    responsavel_nome: "RITA DE CASSIA",
    responsavel_telefone: "(66) 98109-5314",
    responsavel_cpf: "",
    curso_id: 3, // Teclado
    professor_id: 1, // Aquilles Antony
    dia_semana: 3, // Quarta-feira
    horario: "13:00",
    pacote_id: 5,
    aulas_restantes: 4,
    reposicoes: 0,
    faturas_pendentes: 0,
    fatura_mes_atraso: false,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 9
  },
  {
    migracao_id: "533963d5-fc5e-4a78-aa04-4e3995850ef9",
    nome: "KALEBE LUCAS CARVALHO SILVA",
    email: "",
    telefone: "",
    cpf: null,
    endereco: "RUA C, 93, QUADRA 04 RES JUCA DO GUARANÁ 78000000 - Cuiabá - MT",
    data_nascimento: "2017-09-24",
    responsavel_nome: "CALEBE DOS SANTOS SILVA CARVALHO",
    responsavel_telefone: "(65) 98100-8235",
    responsavel_cpf: "015.941.721-02",
    curso_id: 4, // Bateria
    professor_id: 16, // Kalebe Oliveira
    dia_semana: 2, // Terça-feira
    horario: "20:00",
    pacote_id: 5,
    aulas_restantes: 30,
    reposicoes: 0,
    faturas_pendentes: 4,
    fatura_mes_atraso: true,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "0ddda4b0-0c90-4dee-9c18-5728a741d588",
    nome: "KAMILA SHAORY RAFAELA CARVALHO",
    email: "",
    telefone: "",
    cpf: null,
    endereco: "Rua U, 295, QUADRA 39 PQ NOVA ESPERANÇA II 78099387 - Cuiabá - MT",
    data_nascimento: "2007-11-05",
    responsavel_nome: "MAXUEL RAFAEL SILVA",
    responsavel_telefone: "(65) 99211-8906",
    responsavel_cpf: "004.019.751-42",
    curso_id: 5, // Contra Baixo
    professor_id: 2, // Juan Henrique
    dia_semana: 2, // Terça-feira
    horario: "20:00",
    pacote_id: 5,
    aulas_restantes: 20,
    reposicoes: 4,
    faturas_pendentes: 2,
    fatura_mes_atraso: false,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "cf0ab31a-f313-4a31-b87e-ba5692eaaec1",
    nome: "KEMILY DE FARIAS OLIVEIRA",
    email: "",
    telefone: "",
    cpf: null,
    endereco: "Rua Trinta e Três, 09, QUADRA 158 Pedra 90 78099165 - Cuiabá - MT",
    data_nascimento: "2013-12-17",
    responsavel_nome: "ADILSON DE OLIVEIRA",
    responsavel_telefone: "(65) 98438-7965",
    responsavel_cpf: "838.450.461-04",
    curso_id: 2, // Violão
    professor_id: 1, // Aquilles Antony
    dia_semana: 4, // Quinta-feira
    horario: "16:00",
    pacote_id: 5,
    aulas_restantes: 15,
    reposicoes: 2,
    faturas_pendentes: 2,
    fatura_mes_atraso: false,
    valor_parcela: 300,
    valor_desconto: 200,
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

  // 4. Criar Reposições (Escalonadas para respeitar constraint de unicidade)
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
