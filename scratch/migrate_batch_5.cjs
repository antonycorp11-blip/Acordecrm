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

// Converter datas do formato DD/MM/YYYY para YYYY-MM-DD
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
    migracao_id: "671af349-cba1-4f9a-affb-b8ddd6ea0cd9",
    nome: "LARA CAVALCANTE SILVA",
    email: "",
    telefone: "",
    cpf: null,
    endereco: "Rua Onze, 28, QUADRA 11 Jardim Industriário 78098710 - Cuiabá - MT",
    data_nascimento: parseBirthDate("14/08/2019"),
    responsavel_nome: "HELLEN KAROLLYNE ARRUDA CAVALCANTE",
    responsavel_telefone: "(65) 99228-7868",
    responsavel_cpf: "046.404.811-79",
    curso_id: 8, // Musicalização Infantil
    professor_id: 2, // Juan Henrique
    dia_semana: 4, // Quinta-feira
    horario: "20:00",
    pacote_id: 5,
    aulas_restantes: 16,
    reposicoes: 6,
    faturas_pendentes: 1,
    fatura_mes_atraso: false,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "ee8fa7c9-91f6-4f9e-adf7-d1c3f4dccea0",
    nome: "LUANY STEPHANY DE JESUS PORFIRIO GUIMARAES",
    email: "porfirioluany@gmail.com",
    telefone: "(65) 98422-6466",
    cpf: "066.858.991-40",
    endereco: "Rua E, 03, Quadra 03 Pascoal Ramos 78098188 - Cuiabá - MT",
    data_nascimento: parseBirthDate("01/10/2004"),
    responsavel_nome: "",
    responsavel_telefone: "",
    responsavel_cpf: "",
    curso_id: 7, // Tecnica Vocal
    professor_id: 1, // Aquilles Antony
    dia_semana: 3, // Quarta-feira
    horario: "19:00",
    pacote_id: 5,
    aulas_restantes: 36,
    reposicoes: 5,
    faturas_pendentes: 4,
    fatura_mes_atraso: false,
    valor_parcela: 350,
    valor_desconto: 250,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "7a3a5453-59c2-4f1c-ad86-146aaa18af69",
    nome: "LUCAS BELATO",
    email: "",
    telefone: "",
    cpf: null,
    endereco: "ASAS, ASAS 78000000 - Cuiabá - MT",
    data_nascimento: parseBirthDate("01/12/2011"),
    responsavel_nome: "LEANDRO INDLEI VELATO",
    responsavel_telefone: "(65) 99342-8404",
    responsavel_cpf: "503.186.401-04",
    curso_id: 1, // Violão
    professor_id: 2, // Juan Henrique
    dia_semana: 4, // Quinta-feira
    horario: "15:00",
    pacote_id: 5,
    aulas_restantes: 27,
    reposicoes: 1,
    faturas_pendentes: 5,
    fatura_mes_atraso: false,
    valor_parcela: 250,
    valor_desconto: 150,
    dia_vencimento: 10,
    total_parcelas: 12
  },
  {
    migracao_id: "2a484c91-7438-4562-af30-f6330989d8cf",
    nome: "LUCENE DE JESUS DA SILVA DO NASCIMENTO",
    email: "",
    telefone: "(65) 99282-8760",
    cpf: "831.104.291-87",
    endereco: "Rua Francisca Maria Alves da Paz, 25, QUADRA 42 Nova Esperança 78098574 - Cuiabá - MT",
    data_nascimento: parseBirthDate("23/01/1976"),
    responsavel_nome: "",
    responsavel_telefone: "",
    responsavel_cpf: "",
    curso_id: 1, // Violão
    professor_id: 2, // Juan Henrique
    dia_semana: 6, // Sábado
    horario: "11:00",
    pacote_id: 5,
    aulas_restantes: 15,
    reposicoes: 0,
    faturas_pendentes: 2,
    fatura_mes_atraso: false,
    valor_parcela: 300,
    valor_desconto: 200,
    dia_vencimento: 10,
    total_parcelas: 6
  },
  {
    migracao_id: "2a5cda7d-983d-4e87-b467-f4bce1e0f339",
    nome: "LUIS GUSTAVO DA SILVA RIBEIRO",
    email: "",
    telefone: "",
    cpf: null,
    endereco: "Rua Fernando Bazan, CASA 279, CONDOMINIO HAWAI Pascoal Ramos 78098019 - Cuiabá - MT",
    data_nascimento: parseBirthDate("09/02/2011"),
    responsavel_nome: "MARILEY DA SILVA",
    responsavel_telefone: "(65) 98452-5081",
    responsavel_cpf: "022.031.821-21",
    curso_id: 4, // Bateria
    professor_id: 16, // Kalebe Oliveira
    dia_semana: 2, // Terça-feira
    horario: "18:00",
    pacote_id: 5,
    aulas_restantes: 18,
    reposicoes: 1,
    faturas_pendentes: 3,
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
