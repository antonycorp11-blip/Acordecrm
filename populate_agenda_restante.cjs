require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

function getDatesUntil(diaSemanaStr, startDate, endDate) {
  const str = (diaSemanaStr || '').toLowerCase();
  const diaMap = {
    'domingo': 0, 'segunda-feira': 1, 'terça-feira': 2, 'quarta-feira': 3,
    'quinta-feira': 4, 'sexta-feira': 5, 'sábado': 6,
    'segunda': 1, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6
  };
  
  const targetDay = diaMap[str.split(',')[0].trim()];
  if (targetDay === undefined) return [];

  const dates = [];
  let d = new Date(startDate);
  d.setHours(0,0,0,0);
  
  // Ajustar para o primeiro dia de aula a partir da data de início
  while (d.getDay() !== targetDay) {
    d.setDate(d.getDate() + 1);
  }

  const end = new Date(endDate);
  end.setHours(23,59,59,999);

  while (d <= end) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return dates.map(dt => dt.toISOString().split('T')[0]);
}

async function run() {
  console.log('Iniciando carga de agenda persistente...');
  const workbook = xlsx.readFile('relatorio_exportado (19).xlsx');
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const { data: alunosData } = await supabase.from('alunos').select('id, nome');
  const alunosMap = {};
  alunosData?.forEach(a => alunosMap[a.nome.trim()] = a.id);

  const { data: profsData } = await supabase.from('professores').select('id, nome');
  const profsMap = {};
  profsData?.forEach(p => profsMap[p.nome.trim()] = p.id);

  const { data: cursosData } = await supabase.from('cursos').select('id, nome');
  const cursosMap = {};
  cursosData?.forEach(c => cursosMap[c.nome.trim()] = c.id);

  let aulasToInsert = [];
  const hoje = new Date().toISOString().split('T')[0];

  for (const row of rows) {
    const nome = row['Aluno(a)'];
    if (!nome) continue;

    const aluno_id = alunosMap[nome.trim()];
    if (!aluno_id) {
        // console.log(`Aluno não encontrado no banco: ${nome}`);
        continue;
    }

    const profNome = row['Professores']?.replace('Prof. ', '').trim();
    const cursoNome = row['Curso(s)']?.trim();
    const diaSemana = row['Dia(s) da Semana'];
    const horario = row['Horário'];
    const dataMatric = row['Data Matric.'];
    const dataConclusao = row['Conclusão'];

    if (!diaSemana || !horario || !dataMatric || !dataConclusao) continue;

    const professor_id = profsMap[profNome];
    const curso_id = cursosMap[cursoNome];
    if (!professor_id || !curso_id) continue;

    // Converter datas do formato DD/MM/YYYY para Date
    const [dM, mM, yM] = dataMatric.split('/');
    const start = `${yM}-${mM}-${dM}`;
    const [dC, mC, yC] = dataConclusao.split('/');
    const end = `${yC}-${mC}-${dC}`;

    const dates = getDatesUntil(diaSemana, start, end);
    const horarios = horario.split(',').map(h => h.trim());
    
    for (const data of dates) {
      for (const h of horarios) {
        // Validar formato de hora HH:MM
        if (!/^\d{2}:\d{2}$/.test(h)) continue;

        const status = data < hoje ? 'realizada' : 'pendente';

        aulasToInsert.push({
          aluno_id,
          professor_id,
          curso_id,
          data,
          horario: h,
          status,
          tipo: 'Individual'
        });
      }
    }
  }

  if (aulasToInsert.length > 0) {
    console.log(`Limpando aulas antigas e inserindo ${aulasToInsert.length} novas aulas...`);
    
    // Opcional: Limpar aulas futuras para evitar duplicatas antes de reinserir
    // await supabase.from('aulas').delete().gte('data', hoje);

    const chunkSize = 100;
    let successCount = 0;
    for (let i = 0; i < aulasToInsert.length; i += chunkSize) {
      const chunk = aulasToInsert.slice(i, i + chunkSize);
      const { error } = await supabase.from('aulas').upsert(chunk, { 
        onConflict: 'aluno_id,data,horario' 
      });
      if (error) {
        console.error('Erro ao inserir bloco:', error.message);
      } else {
        successCount += chunk.length;
      }
    }
    console.log(`Processo finalizado! ${successCount} aulas cadastradas na agenda.`);
  } else {
    console.log('Nenhuma aula para processar.');
  }
}

run();
