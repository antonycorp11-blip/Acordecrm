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

async function migrateRegularStudent(student) {
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

  // 6. Marcar na fila
  const { error: errQueue } = await supabase
    .from('migracao_alunos')
    .update({ status: 'concluido' })
    .eq('id', student.migracao_id);

  if (errQueue) console.error(`[-] Erro ao atualizar status na fila:`, errQueue);
  else console.log(`[+] Status da migração definido como Concluído!`);

  console.log(`[✔] MIGRACÃO DE ${student.nome} FINALIZADA COM SUCESSO!`);
}

async function migrateMultiCourseStudent(studentData) {
  console.log(`\n>>> Migrando aluno com 2 cursos: ${studentData.nome}...`);

  // 1. Criar Aluno Único
  const { data: aluno, error: errA } = await supabase.from('alunos').insert([{ 
    nome: studentData.nome, 
    email: studentData.email || null,
    telefone: studentData.telefone || null, 
    cpf: studentData.cpf, 
    endereco: studentData.endereco,
    data_nascimento: studentData.data_nascimento,
    responsavel_nome: studentData.responsavel_nome || null,
    responsavel_telefone: studentData.responsavel_telefone || null,
    responsavel_cpf: studentData.responsavel_cpf || null,
    status: 'ativo'
  }]).select().single();

  if (errA) {
    console.error(`[-] Erro ao criar aluno ${studentData.nome}:`, errA);
    return;
  }
  console.log(`[+] Registro de Aluno Único criado! ID: ${aluno.id}`);

  const spDate = new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"});
  const now = new Date(spDate);
  const dataHojeLocal = formatLocalDateString(now);

  // Iterar pelas duas matrículas/cursos
  for (const course of studentData.cursos) {
    console.log(`\n[~] Criando matrícula para o curso ID: ${course.curso_id} (${course.descricao_curso})...`);

    const { data: matricula, error: errM } = await supabase.from('matriculas').insert([{
      aluno_id: aluno.id, 
      curso_id: course.curso_id, 
      professor_id: course.professor_id, 
      dia_semana: course.dia_semana, 
      horario: course.horario, 
      pacote_id: course.pacote_id, 
      dia_vencimento: course.dia_vencimento,
      valor_parcela: course.valor_parcela,
      valor_com_desconto: course.valor_desconto,
      total_parcelas: course.total_parcelas,
      data_inicio: dataHojeLocal
    }]).select().single();

    if (errM) {
      console.error(`[-] Erro ao criar matrícula do curso ${course.descricao_curso}:`, errM);
      continue;
    }
    console.log(`[+] Matrícula de ${course.descricao_curso} criada! ID: ${matricula.id}`);

    // Criar Aulas regulares
    const nAulas = course.aulas_restantes;
    if (nAulas > 0) {
      const aulasToInsert = [];
      let currentAulaDate = new Date(spDate);
      const targetDay = course.dia_semana;
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
          professor_id: course.professor_id,
          curso_id: course.curso_id,
          data: formatLocalDateString(currentAulaDate),
          horario: course.horario,
          status: 'pendente',
          tipo: 'regular'
        });
        currentAulaDate.setDate(currentAulaDate.getDate() + 7);
      }
      const { error: errAulas } = await supabase.from('aulas').insert(aulasToInsert);
      if (errAulas) console.error(`[-] Erro ao criar aulas de ${course.descricao_curso}:`, errAulas);
      else console.log(`[+] ${nAulas} Aulas regulares geradas para ${course.descricao_curso}!`);
    }

    // Criar Reposições
    const nRepos = course.reposicoes;
    if (nRepos > 0) {
      const reposToInsert = [];
      for (let i = 0; i < nRepos; i++) {
        const day = 31 - i;
        reposToInsert.push({
          aluno_id: aluno.id,
          matricula_id: matricula.id,
          professor_id: course.professor_id,
          curso_id: course.curso_id,
          data: `2099-12-${day}`,
          horario: '00:00',
          status: 'pendente',
          tipo: 'reposicao'
        });
      }
      const { error: errRepos } = await supabase.from('aulas').insert(reposToInsert);
      if (errRepos) console.error(`[-] Erro ao criar reposições de ${course.descricao_curso}:`, errRepos);
      else console.log(`[+] ${nRepos} Aula(s) de reposição gerada(s) para ${course.descricao_curso}!`);
    }

    // Gerar Pagamentos
    const pagamentosToInsert = [];
    const nFaturasFuturas = course.faturas_pendentes;
    if (nFaturasFuturas > 0) {
      for (let i = 1; i <= nFaturasFuturas; i++) {
        const nextDate = new Date(now.getFullYear(), now.getMonth() + i, course.dia_vencimento);
        pagamentosToInsert.push({
          aluno_id: aluno.id,
          matricula_id: matricula.id,
          valor: course.valor_parcela,
          valor_com_desconto: course.valor_desconto,
          data_vencimento: formatLocalDateString(nextDate),
          status: 'pendente',
          tipo_receita: 'mensalidade',
          referencia_mes_ano: `${String(nextDate.getMonth() + 1).padStart(2, '0')}/${nextDate.getFullYear()}`
        });
      }
    }

    if (pagamentosToInsert.length > 0) {
      const { error: errPags } = await supabase.from('pagamentos').insert(pagamentosToInsert);
      if (errPags) console.error(`[-] Erro ao criar faturas para ${course.descricao_curso}:`, errPags);
      else console.log(`[+] ${pagamentosToInsert.length} Lançamento(s) financeiro(s) gerado(s) para ${course.descricao_curso}!`);
    }
  }

  // Marcar na fila
  const { error: errQueue } = await supabase
    .from('migracao_alunos')
    .update({ status: 'concluido' })
    .eq('id', studentData.migracao_id);

  if (errQueue) console.error(`[-] Erro ao atualizar status na fila:`, errQueue);
  else console.log(`[+] Status da migração definido como Concluído!`);

  console.log(`[✔] MIGRACÃO DE ${studentData.nome} COM SEUS 2 CURSOS FINALIZADA COM SUCESSO!`);
}

async function main() {
  // 1. Alunos regulares (Pietro, Raissa, Rebeca)
  const regulars = [
    {
      migracao_id: "4980d582-d5a1-49c1-88db-cbec6039a982",
      nome: "PIETRO JORGE DE ALMEIDA",
      email: "pietrojorgedealmeidapereira@gmail.com",
      telefone: "(65) 98112-2430",
      cpf: null,
      endereco: "",
      data_nascimento: parseBirthDate("26/08/2016"),
      responsavel_nome: "ANA CELIA PEREIRA DE ALMEIDA",
      responsavel_telefone: "(65) 98112-2430",
      responsavel_cpf: null,
      curso_id: 4, // Bateria
      professor_id: 16, // Calebe Oliveira
      dia_semana: 6, // Sábado
      horario: "10:00",
      pacote_id: 5,
      aulas_restantes: 40,
      reposicoes: 0,
      faturas_pendentes: 10,
      faturas_atrasadas: 1, // 1 parcela vencida
      valor_parcela: 370,
      valor_desconto: 270,
      dia_vencimento: 10,
      total_parcelas: 12
    },
    {
      migracao_id: "a4098b59-769d-4a13-9646-4621e4ba60d3",
      nome: "RAISSA FERNANDA CASTRO DE LARA",
      email: "",
      telefone: "(65) 99266-2160",
      cpf: "062.625.401-99",
      endereco: "Rua Sessenta, 18, QUADRA 219 Pedra 90 78099300 - Cuiabá - MT",
      data_nascimento: parseBirthDate("17/04/2004"),
      responsavel_nome: "",
      responsavel_telefone: "",
      responsavel_cpf: "",
      curso_id: 7, // Técnica Vocal
      professor_id: 1, // Aquilles Antony
      dia_semana: 6, // Sábado
      horario: "13:00",
      pacote_id: 5,
      aulas_restantes: 41,
      reposicoes: 0,
      faturas_pendentes: 10,
      faturas_atrasadas: 5, // 5 parcelas vencidas
      valor_parcela: 350,
      valor_desconto: 250,
      dia_vencimento: 10,
      total_parcelas: 12
    },
    {
      migracao_id: "ee698d63-b9ae-450c-8510-a2fdec091c34",
      nome: "REBECA MIKAELI DE CARVALHO BOTONI",
      email: "",
      telefone: "",
      cpf: null,
      endereco: "Rua 28, 3, QUADRA 12 Residencial Coxipó (SANTA TEREZINHA) 78089660 - Cuiabá - MT",
      data_nascimento: parseBirthDate("05/04/2013"),
      responsavel_nome: "PATRICIA DE CARVALHO BOTONI",
      responsavel_telefone: "(65) 98122-5833",
      responsavel_cpf: "044.711.291-04",
      curso_id: 3, // Teclado
      professor_id: 1, // Aquilles Antony
      dia_semana: 6, // Sábado
      horario: "09:00",
      pacote_id: 5,
      aulas_restantes: 25,
      reposicoes: 2,
      faturas_pendentes: 4,
      faturas_atrasadas: 1, // 1 parcela vencida
      valor_parcela: 350,
      valor_desconto: 250,
      dia_vencimento: 10,
      total_parcelas: 12
    }
  ];

  for (const student of regulars) {
    await migrateRegularStudent(student);
  }

  // 2. Aluna Especial (Rafaela Marques) com dois cursos
  const specialStudent = {
    migracao_id: "32fa89e7-9dbd-45e7-a223-1ddafafe5396",
    nome: "RAFAELA MARQUES",
    email: "bianalaura@hotmail.com",
    telefone: "(65) 99953-3973",
    cpf: null,
    endereco: "",
    data_nascimento: parseBirthDate("12/05/2016"),
    responsavel_nome: "FABIANA LAURA RIBEIRO",
    responsavel_telefone: "(65) 99953-3973",
    responsavel_cpf: "696.900.221-72",
    cursos: [
      {
        descricao_curso: "Técnica Vocal Laranja",
        curso_id: 7,
        professor_id: 1,
        dia_semana: 5, // Sexta-feira
        horario: "15:00",
        pacote_id: 5,
        aulas_restantes: 36,
        reposicoes: 1,
        faturas_pendentes: 8,
        valor_parcela: 350,
        valor_desconto: 250,
        dia_vencimento: 10,
        total_parcelas: 12
      },
      {
        descricao_curso: "Violão Laranja",
        curso_id: 1,
        professor_id: 1,
        dia_semana: 5, // Sexta-feira
        horario: "14:00",
        pacote_id: 5,
        aulas_restantes: 35,
        reposicoes: 1,
        faturas_pendentes: 8,
        valor_parcela: 350,
        valor_desconto: 250,
        dia_vencimento: 10,
        total_parcelas: 12
      }
    ]
  };

  await migrateMultiCourseStudent(specialStudent);
}

main().catch(console.error);
