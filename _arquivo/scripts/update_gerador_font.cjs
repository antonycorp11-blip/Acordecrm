const fs = require('fs');

let code = fs.readFileSync('src/components/GeradorContrato.tsx', 'utf8');

const NEW_CLAUSES = `const CLAUSULAS_FALLBACK = [
  "REPOSIÇÕES E REAGENDAMENTOS: A reposição de faltas será concedida exclusivamente mediante apresentação de atestado ou receita médica. Fica permitido o reagendamento de aulas o limite de apenas 1 (uma) vez ao mês.",
  "DA ADESÃO: A assinatura implica ciência e aceitação integral das condições vigentes. Solicitação de cancelamento posterior não afasta as obrigações assumidas.",
  "DA INADIMPLÊNCIA: Atrasos geram multa de 2% e juros de 1% a.m. Após 30 dias inadimplente, as aulas poderão ser suspensas até regularização, sem direito à reposição.",
  "FALTAS PELA ESCOLA: Cancelamentos motivados pela escola ou professor terão reposição integral em data a combinar.",
  "FERIADOS: Feriados e recessos já compõem o calendário acadêmico anual, não gerando reposição ou desconto.",
  "PORTAL DO ALUNO: Acesso pessoal, intransferível e gratuito a materiais complementares. Sujeito a manutenções técnicas.",
  "CERTIFICADO: A emissão exige conclusão do curso, adimplência financeira e realização das atividades no Portal.",
  "ABANDONO: A ausência injustificada não cancela o contrato. As parcelas seguem devidas até a solicitação formal de cancelamento.",
  "TOLERÂNCIA: Limite de 15 minutos de atraso, sem reposição do tempo perdido, encerrando-se a aula no horário previsto original.",
  "DADOS E IMAGEM: Dados tratados conforme LGPD. Autoriza-se o uso de imagem do aluno para fins institucionais da escola, salvo oposição formal por escrito.",
  "EQUIPAMENTOS: O contratante responsabiliza-se pelo ressarcimento de danos aos equipamentos da escola causados por mau uso. Exclui-se o desgaste natural.",
  "RESCISÃO PELO ALUNO: Vigência de 12 meses. O cancelamento antecipado gera multa rescisória de 20% sobre o saldo das mensalidades restantes, pagável em até 3 dias úteis.",
  "NORMAS E RESCISÃO PELA ESCOLA: Exige-se respeito às normas. Inadimplência, mau comportamento ou danos ao patrimônio podem gerar advertência ou rescisão imediata do contrato pela escola.",
  "PROFESSORES: A escola reserva-se o direito de substituir professores, horários ou alterar metodologias, não justificando cancelamento isento de multa.",
  "FORO: Eleito o foro da Comarca de Cuiabá-MT para dirimir controvérsias judiciais decorrentes deste contrato."
];`;

// Replace the fallback block
code = code.replace(/const CLAUSULAS_FALLBACK = \[[^\]]*\];/, NEW_CLAUSES);

// Update font size from 10px to 12px for the root container
code = code.replace(
  `style={{ width: '800px', fontFamily: 'serif', fontSize: '10px', lineHeight: '1.2', color: '#000', backgroundColor: '#fff' }}`,
  `style={{ width: '800px', fontFamily: 'serif', fontSize: '12px', lineHeight: '1.2', color: '#000', backgroundColor: '#fff' }}`
);

// Update paragraph sizes from text-[8px] to text-xs or text-[10px]
code = code.replace(/text-\[8px\]/g, "text-[10px]");

fs.writeFileSync('src/components/GeradorContrato.tsx', code);
console.log('Fixed GeradorContrato.tsx');
