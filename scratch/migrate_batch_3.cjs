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
    migracao_id: "fa4ffb37-1c58-4856-849f-a12ac89324b9",
    nome: "GUSTAVO ARRUDA DA SILVA",
    email: "",
    telefone: "(65) 98446-9247",
    cpf: "061.291.551-40",
    endereco: "Rua Dezesseis, 42, QUADRA 83 Pedra 90 78099080 - Cuiabá - MT",
    data_nascimento: "2006-09-23",
    responsavel_nome: "",
    responsavel_telefone: "",
    responsavel_cpf: "",
    curso_id: 3, // Teclado
    professor_id: 1, // Aquilles Antony
    dia_semana: 5, // Sexta-feira
    horario: "17:00",
    pacote_id: 5,
    aulas_restantes: 29,
    reposicoes: 3,
    faturas_pendentes: 3,
    fatura_mes_atraso: false,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "a11f0b18-add4-4086-a6bd-69163f606816",
    nome: "HEITOR SONAQUE DE SOUZA",
    email: "",
    telefone: "",
    cpf: null,
    endereco: "Avenida das Palmeiras, 186, QUADRA F COND RESERVA RIO CUIABA Jardim Imperial 78075850 - Cuiabá - MT",
    data_nascimento: "2016-10-23",
    responsavel_nome: "FRANCIELE SONAQUE DA SILVA SOUZA",
    responsavel_telefone: "(65) 99305-6838",
    responsavel_cpf: "035.002.891-50",
    curso_id: 3, // Teclado
    professor_id: 2, // Juan Henrique
    dia_semana: 2, // Terça-feira
    horario: "18:00",
    pacote_id: 5,
    aulas_restantes: 18,
    reposicoes: 3,
    faturas_pendentes: 1,
    fatura_mes_atraso: false,
    valor_parcela: 300,
    valor_desconto: 200,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "fb4ad074-027a-4103-ad8e-7df927ecf694",
    nome: "HELOISA LIMA ESTEVAO",
    email: "adriahair1@hotmail.com",
    telefone: "",
    cpf: null,
    endereco: "Rua Castro Alves, 1 Santa Laura 78091122 - Cuiabá - MT",
    data_nascimento: "2013-05-11",
    responsavel_nome: "ADRIANA LIMA DA SILVA ESTEVAO",
    responsavel_telefone: "(65) 99342-9352",
    responsavel_cpf: "",
    curso_id: 7, // Técnica Vocal
    professor_id: 1, // Aquilles Antony
    dia_semana: 3, // Quarta-feira
    horario: "17:00",
    pacote_id: 5,
    aulas_restantes: 46,
    reposicoes: 0,
    faturas_pendentes: 10,
    fatura_mes_atraso: false,
    valor_parcela: 370,
    valor_desconto: 270,
    dia_vencimento: 10,
    total_parcelas: 11
  },
  {
    migracao_id: "4e83eda9-dfa2-4d4c-bcf1-6af149817fea",
    nome: "ISAAC GONZAGA MARIO",
    email: "",
    telefone: "",
    cpf: null,
    endereco: "Rua Benedito Antônio, 512 Pascoal Ramos 78098020 - Cuiabá - MT",
    data_nascimento: "2018-12-12",
    responsavel_nome: "JOSYANNE BARROS GONZAGA MARIO",
    responsavel_telefone: "",
    responsavel_cpf: "022.776.051-40",
    curso_id: 3, // Teclado
    professor_id: 3, // Jonilson Nascimento
    dia_semana: 4, // Quinta-feira
    horario: "19:00",
    pacote_id: 5,
    aulas_restantes: 36,
    reposicoes: 3,
    faturas_pendentes: 4,
    fatura_mes_atraso: true,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "bb553323-9aaf-4025-9334-2d5fa68949fb",
    nome: "JADNA DA SILVA LIMA",
    email: "",
    telefone: "",
    cpf: null,
    endereco: "RUA 11, 26, 50 PEDRA 90 78000000 - Cuiabá - MT",
    data_nascimento: "2013-09-13",
    responsavel_nome: "GENIVAL CASTRO LIMA",
    responsavel_telefone: "(00) 00000-0005",
    responsavel_cpf: "818.581.585-15",
    curso_id: 3, // Teclado
    professor_id: 1, // Aquilles Antony
    dia_semana: 3, // Quarta-feira
    horario: "09:00",
    pacote_id: 5,
    aulas_restantes: 34,
    reposicoes: 3,
    faturas_pendentes: 8,
    fatura_mes_atraso: true,
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
