require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const rawData = `SULISMAIK DE SOUZA — R$ 250,00
LUCAS BELATO — R$ 250,00
JOÃO HENRIQUE SOUZA MAGALHÃES — R$ 200,00
ERICA MILENA DA SILVA — R$ 250,00
VITOR OLIVEIRA — R$ 250,00
MARIA CLARA SOUZA COSTA — R$ 220,00
LARA CAVALCANTE SILVA — R$ 220,00
DAVI MIGUEL GOMES DE BRITO — R$ 220,00
KEMILY DE FARIAS OLIVEIRA — R$ 220,00
HEITOR SONAQUE DE SOUZA — R$ 220,00
KAMILA SHAORY RAFAELA CARVALHO — R$ 250,00
ENZO GABRIEL NERY MARQUES — R$ 250,00
RICARDO GABRIEL DE ASSUNCAO — R$ 250,00
LUIS GUSTAVO DA SILVA RIBEIRO — R$ 250,00
GUSTAVO ARRUDA DA SILVA — R$ 250,00
ATAIDE CELESTINO RAMOS DOS SANTOS — R$ 250,00
RODRIGO SOUZA PINTO — R$ 225,00
JADNA DA SILVA LIMA — R$ 250,00
ARTHUR GATZKE KOHLER DE MELO — R$ 125,00
ISAAC GONZAGA MARIO — R$ 250,00
LUANY STEPHANY DE JESUS PORFIRIO GUIMARAES — R$ 250,00
KALEBE LUCAS CARVALHO SILVA — R$ 250,00
RAISSA FERNANDA CASTRO DE LARA — R$ 250,00
ENZO RAFAEL OLVEIRA DA SILVA — R$ 250,00
MATHEUS HENRIQUE DA SILVA PININGA DE SOUZA — R$ 250,00
ACSA LORENA EVANGELISTA SANTIAGO — R$ 320,00
SAMARA CRISTINA DA MOTA SILVA — R$ 250,00
GUILHERME NUNES BARBOSA — R$ 250,00
ANA JULIA MONTEIRO KLEIN — R$ 250,00
EDUARDO ANTONIO — R$ 250,00
RAFAELA MARQUES — R$ 225,00
RAFAELA MARQUES — R$ 225,00
ARTHUR CARVALHO ALVES — R$ 250,00
THEO ANDRADE DE SOUZA — R$ 225,00
SOFYA ANDRADE DE SOUZA — R$ 225,00
PIETRO JORGE DE ALMEIDA — R$ 270,00
CARLOS JUNIOR RONDON LOITERO — R$ 270,00
MAXUEL HENRIQUE DE PAULA CAMPOS — R$ 270,00
WANESSA MIRANDA — R$ 270,00
WILSON FERREIRA DINIZ NETO — R$ 270,00
ARTENISA QUELEM NASCIMENTO — R$ 270,00
ADRIANE MARIA DE OLIVEIRA BRITO — R$ 270,00
DOMILLYCK ALEXANDRE GONCALVES DA SILVA — R$ 270,00
EDVANIA PEREIRA MATOS DA SILVA — R$ 270,00
MATHEUS NASCIMENTO DA CRUZ — R$ 220,00
BRENDA RAILLA GAMA DOS SANTOS — R$ 220,00
BRUNA GAMA DOS SANTOS — R$ 220,00
ELIAS SAMUEL CANDIDO DE SOUZA — R$ 220,00
HELOISA LIMA ESTEVAO — R$ 270,00
DOUGLAS ANTONIO ALMEIDA PEREIRA — R$ 270,00
ELIEZER DAVID — R$ 270,00
ROBSON SOLLES MENDES — R$ 270,00
BENJAMIN KALEB BARBOSA OLIVEIRA — R$ 270,00
REBECA MIKAELI DE CARVALHO BOTONI — R$ 250,00
LUCENE DE JESUS DA SILVA DO NASCIMENTO — R$ 300,00
THAYLA MAYSA SILVA DO NASCIMENTO — R$ 300,00
ANNA SOFIA RAMIRES FERREIRA SAMPAIO — R$ 270,00
ELOIZA MARIA ALVES RAMOS — R$ 270,00`;

const updates = [];

const lines = rawData.split('\n').map(l => l.trim()).filter(Boolean);
for (const line of lines) {
  const [nomeRaw, valorRaw] = line.split(' — R$ ');
  if (!nomeRaw || !valorRaw) continue;
  const nome = nomeRaw.trim();
  const valorNum = parseFloat(valorRaw.replace(',', '.'));
  
  let valorCheio = valorNum;
  let valorDesconto = valorNum;
  
  if (valorNum === 250 || valorNum === 270) {
    valorCheio = valorNum + 100;
    valorDesconto = valorNum;
  }
  
  updates.push({ nome, valorCheio, valorDesconto });
}

async function run() {
  console.log('Starting script...');
  
  // Get all active alunos with their matriculas
  const { data: alunos, error } = await supabase.from('alunos')
    .select('id, nome, matriculas(id, status)')
    .neq('status', 'arquivado');
    
  if (error) {
    console.error('Error fetching alunos:', error);
    return;
  }
  
  let totalUpdated = 0;
  
  for (const up of updates) {
    const nomeNorm = up.nome.toUpperCase().trim();
    // find student
    const aluno = alunos.find(a => a.nome.toUpperCase().trim() === nomeNorm);
    if (!aluno) {
      console.log('WARNING: Aluno not found in DB:', nomeNorm);
      continue;
    }
    
    // update their active matricula
    const matricula = aluno.matriculas.find(m => m.status === 'ativa');
    if (!matricula) {
      console.log('WARNING: No active matricula for:', nomeNorm);
      continue;
    }
    
    // Update matricula
    const { error: err1 } = await supabase.from('matriculas')
      .update({
        valor_parcela: up.valorCheio,
        valor_com_desconto: up.valorDesconto
      })
      .eq('id', matricula.id);
      
    if (err1) {
      console.error('Error updating matricula for', nomeNorm, err1);
      continue;
    }
    
    // Update PENDENTE pagamentos for this student
    const { error: err2 } = await supabase.from('pagamentos')
      .update({
        valor: up.valorCheio
      })
      .eq('aluno_id', aluno.id)
      .eq('status', 'pendente')
      .eq('tipo_receita', 'mensalidade');
      
    if (err2) {
      console.error('Error updating pagamentos for', nomeNorm, err2);
      continue;
    }
    
    console.log(`Updated ${nomeNorm} => Cheio: ${up.valorCheio}, Desconto: ${up.valorDesconto}`);
    totalUpdated++;
  }
  
  console.log('Done! Updated', totalUpdated, 'records.');
}

run();
