require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

function getNext4Dates(diaSemanaStr) {
  // Normalize string
  const str = (diaSemanaStr || '').toLowerCase();
  const diaMap = {
    'domingo': 0, 'segunda-feira': 1, 'terça-feira': 2, 'quarta-feira': 3,
    'quinta-feira': 4, 'sexta-feira': 5, 'sábado': 6
  };
  
  // Handle cases like 'Sexta-feira,Sexta-feira' by taking the first one
  const firstDay = str.split(',')[0].trim();
  const targetDay = diaMap[firstDay];
  if (targetDay === undefined) return [];

  const dates = [];
  let d = new Date();
  d.setHours(0,0,0,0);
  
  // Find the next occurrence of targetDay
  while (d.getDay() !== targetDay) {
    d.setDate(d.getDate() + 1);
  }

  for (let i = 0; i < 4; i++) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return dates.map(dt => dt.toISOString().split('T')[0]);
}

async function run() {
  const workbook = xlsx.readFile('relatorio_exportado (19).xlsx');
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  // Load Alunos
  const { data: alunosData } = await supabase.from('alunos').select('id, nome');
  const alunosMap = {};
  alunosData?.forEach(a => alunosMap[a.nome] = a.id);

  // Load Professores
  const { data: profsData } = await supabase.from('professores').select('id, nome');
  const profsMap = {};
  profsData?.forEach(p => profsMap[p.nome] = p.id);

  // Load Cursos
  const { data: cursosData } = await supabase.from('cursos').select('id, nome');
  const cursosMap = {};
  cursosData?.forEach(c => cursosMap[c.nome] = c.id);

  let aulasToInsert = [];

  for (const row of rows) {
    const nome = row['Aluno(a)'];
    if (!nome || nome === 'Aluno(a)') continue;

    const aluno_id = alunosMap[nome];
    if (!aluno_id) continue;

    let profNomeRaw = row['Professores'];
    if (!profNomeRaw) continue;
    let profNome = profNomeRaw.replace('Prof. ', '').trim();
    
    let cursoNome = row['Curso(s)'];
    if (!cursoNome) continue;
    cursoNome = cursoNome.trim();

    const diaSemana = row['Dia(s) da Semana'];
    const horario = row['Horário'];
    if (!diaSemana || !horario) continue;

    // Resolve Professor
    let professor_id = profsMap[profNome];
    if (!professor_id) {
      const { data: p, error: pErr } = await supabase.from('professores').insert([{ 
        nome: profNome, 
        email: `${profNome.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@acorde.com`,
        status: 'ativo' 
      }]).select().single();
      if (pErr) console.error('Erro prof:', pErr);
      if (p) {
        professor_id = p.id;
        profsMap[profNome] = professor_id;
      }
    }

    // Resolve Curso
    let curso_id = cursosMap[cursoNome];
    if (!curso_id) {
      const { data: c, error: cErr } = await supabase.from('cursos').insert([{ 
        nome: cursoNome, 
        descricao: cursoNome
      }]).select().single();
      if (cErr) console.error('Erro curso:', cErr);
      if (c) {
        curso_id = c.id;
        cursosMap[cursoNome] = curso_id;
      }
    }
    
    if (!professor_id || !curso_id) continue;

    // Generate Dates
    const dates = getNext4Dates(diaSemana);
    for (const data of dates) {
      aulasToInsert.push({
        aluno_id,
        professor_id,
        curso_id,
        data,
        horario,
        status: 'pendente'
      });
    }
  }

  if (aulasToInsert.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < aulasToInsert.length; i += chunkSize) {
      const chunk = aulasToInsert.slice(i, i + chunkSize);
      const { error } = await supabase.from('aulas').insert(chunk);
      if (error) console.error('Erro inserindo aulas:', error);
    }
    console.log(`Inseridas ${aulasToInsert.length} aulas com sucesso!`);
  } else {
    console.log('Nenhuma aula para inserir.');
  }
}
run();
