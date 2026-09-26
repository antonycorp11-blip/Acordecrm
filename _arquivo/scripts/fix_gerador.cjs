const fs = require('fs');

let code = fs.readFileSync('src/components/GeradorContrato.tsx', 'utf8');

const NEW_CLAUSES = `const CLAUSULAS_FALLBACK = [
  "As aulas são previamente agendadas, sendo responsabilidade do aluno cumprir os dias e horários combinados; durante a vigência deste contrato, o aluno terá direito a até 8 (oito) reposições gratuitas, desde que a solicitação seja feita em até 3 (três) dias após a falta.",
  "DA ADESÃO E CIÊNCIA DAS CONDIÇÕES CONTRATUAIS: A assinatura deste contrato ocorre presencialmente nas dependências do Studio Acorde, após ciência e concordância do contratante com todas as cláusulas e condições aqui estabelecidas. Parágrafo primeiro. A assinatura deste instrumento implica aceitação integral de todas as suas disposições, produzindo efeitos imediatos a partir da data da contratação. Parágrafo segundo. Eventual solicitação de cancelamento realizada após a assinatura do contrato não afasta as obrigações assumidas pelo contratante, inclusive quanto à incidência da multa rescisória prevista neste instrumento.",
  "DA INADIMPLÊNCIA: Em caso de atraso no pagamento da mensalidade, incidirá multa de 2% (dois por cento) sobre o valor devido, acrescida de juros de mora de 1% (um por cento) ao mês, calculados proporcionalmente aos dias de atraso. Parágrafo único. Após 30 (trinta) dias de inadimplência, o Studio Acorde poderá suspender a prestação dos serviços até a regularização dos valores pendentes, sem que isso gere direito a reposição das aulas não frequentadas durante o período de suspensão.",
  "DAS FALTAS E REPOSIÇÕES POR PARTE DA ESCOLA: Caso a aula seja cancelada por iniciativa do Studio Acorde ou do professor responsável, será garantida ao aluno a reposição integral da aula em data e horário definidos pela escola.",
  "DOS FERIADOS E RECESSOS: Não haverá aulas nos feriados nacionais, estaduais e municipais, bem como nos períodos de recesso definidos pela escola. Tais datas já são consideradas na organização do calendário acadêmico anual e não gerarão direito a reposição ou desconto na mensalidade.",
  "DO PORTAL DO ALUNO: O Studio Acorde disponibiliza gratuitamente ao aluno acesso ao Portal do Aluno, contendo materiais complementares, conteúdos teóricos, avaliações, atividades e demais recursos educacionais. Parágrafo primeiro. O Portal do Aluno constitui benefício complementar ao curso presencial e poderá passar por atualizações, manutenções, alterações de layout ou interrupções temporárias para melhorias técnicas. Parágrafo segundo. O acesso ao Portal do Aluno é pessoal e intransferível, sendo vedado o compartilhamento de login e senha com terceiros.",
  "DO CERTIFICADO DE CONCLUSÃO: O certificado de conclusão será disponibilizado somente ao aluno que cumprir simultaneamente os seguintes requisitos: I – Concluir o período contratado do curso; II – Estar adimplente com todas as obrigações financeiras perante a escola; III – Concluir as atividades, avaliações e conteúdos obrigatórios disponibilizados no Portal do Aluno. Parágrafo único. O não cumprimento de qualquer dos requisitos acima impedirá a emissão do certificado até sua regularização.",
  "DO ABANDONO DO CURSO: A ausência do aluno às aulas, independentemente do período, não caracteriza cancelamento automático do contrato. Parágrafo único. As mensalidades permanecerão devidas até que o contratante formalize o pedido de cancelamento junto ao Studio Acorde pelos canais oficiais da instituição.",
  "DA TOLERÂNCIA DE ATRASO: O aluno terá tolerância máxima de 15 (quinze) minutos de atraso para comparecimento à aula. Parágrafo único. O tempo de atraso não será reposto, devendo a aula ser encerrada no horário originalmente previsto para preservar a agenda dos demais alunos.",
  "DA PROTEÇÃO DE DADOS: Os dados pessoais fornecidos pelo contratante e pelo aluno serão utilizados exclusivamente para fins administrativos, acadêmicos, financeiros e de comunicação relacionados à execução deste contrato, observando-se as disposições da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados – LGPD).",
  "DO USO DE IMAGEM: O contratante autoriza o Studio Acorde a utilizar fotografias, vídeos e demais registros de imagem do aluno para divulgação institucional da escola em redes sociais, materiais publicitários, site oficial e demais meios de comunicação. Parágrafo único. Caso não deseje autorizar o uso de imagem, o contratante deverá manifestar sua oposição por escrito à escola.",
  "DA CONSERVAÇÃO DOS EQUIPAMENTOS: O aluno compromete-se a utilizar com zelo e responsabilidade os instrumentos musicais, móveis, equipamentos eletrônicos, acessórios e demais bens disponibilizados pelo Studio Acorde durante as aulas. Parágrafo primeiro. Caso seja constatado que o aluno causou dano, quebra, avaria ou inutilização de qualquer equipamento, instrumento ou patrimônio da escola por mau uso, negligência, imprudência ou uso inadequado, ficará o contratante responsável pelo ressarcimento integral dos prejuízos causados. Parágrafo segundo. O valor do ressarcimento será equivalente ao custo de reparo ou substituição do item danificado, conforme orçamento apresentado pela escola. Parágrafo terceiro. O desgaste natural decorrente do uso normal dos equipamentos não gera qualquer responsabilidade ao aluno.",
  "DA RESCISÃO CONTRATUAL PELO CONTRATANTE: O presente contrato possui prazo determinado de 12 (doze) meses. Em caso de solicitação de cancelamento antecipado por iniciativa do contratante, será aplicada multa rescisória correspondente a 20% (vinte por cento) sobre o valor das mensalidades vincendas restantes até o término do contrato. Exemplo: caso o aluno tenha cumprido 6 (seis) meses do contrato e solicite o cancelamento, a multa será calculada sobre as 6 (seis) mensalidades restantes. Parágrafo único. O valor da multa deverá ser quitado em até 03 (três) dias úteis após a formalização do cancelamento.",
  "DAS NORMAS INTERNAS: O aluno e seu responsável declaram estar cientes das normas internas de funcionamento do Studio Acorde, comprometendo-se a respeitar professores, colaboradores, alunos, patrimônio da escola e regras de convivência. Parágrafo único. Comportamentos que comprometam o ambiente educacional, incluindo desrespeito, agressões, ofensas, danos ao patrimônio ou condutas incompatíveis com a proposta da instituição, poderão ensejar advertência e, em casos graves ou reincidentes, a rescisão do contrato por iniciativa da escola.",
  "DA RESCISÃO CONTRATUAL PELA ESCOLA: O Studio Acorde poderá rescindir o presente contrato nos casos de inadimplência, descumprimento das cláusulas contratuais, comportamento inadequado do aluno ou responsável, danos ao patrimônio da instituição ou qualquer situação que torne inviável a continuidade da prestação dos serviços. Parágrafo único. A rescisão por iniciativa da escola não afasta a obrigação do contratante de quitar valores eventualmente vencidos e não pagos até a data do encerramento do contrato.",
  "DA SUBSTITUIÇÃO DE PROFESSORES: O contratante declara estar ciente de que os serviços educacionais são prestados pelo Studio Acorde, podendo a escola, a qualquer tempo, realizar substituições, remanejamentos ou alterações em seu corpo docente, horários, metodologias e organização pedagógica, sempre que necessário para a adequada prestação dos serviços. Parágrafo único. A substituição de professor não caracteriza descumprimento contratual e não constitui motivo para cancelamento sem incidência da multa rescisória prevista neste contrato.",
  "DO FORO: Fica eleito o foro da Comarca de Cuiabá – MT para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja."
];`;

// Replace old fallback clauses
code = code.replace(/const CLAUSULAS_FALLBACK = \[[^\]]*\];/, NEW_CLAUSES);

// Update CPF and Endereco states
code = code.replace(
  `const [novoCpf, setNovoCpf] = useState(aluno.cpf || "");`,
  `const [novoCpf, setNovoCpf] = useState(aluno.responsavel_cpf || aluno.cpf || "");`
);

// We need to make sure 'novoEndereco' exists.
// Wait, 'novoEndereco' state is already initialized with 'aluno.endereco || ""' in GeradorContrato.tsx.
// Let's verify RG.
code = code.replace(
  `const [novoRg, setNovoRg] = useState("");`,
  ``
);

// Remove the RG div from the print and edit views!
const rgEditDiv = `<div className="flex-1">
                    <label className="text-[8px] font-black text-[#8e7164] uppercase block mb-1">RG</label>
                    <input type="text" value={novoRg} onChange={e => setNovoRg(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                  </div>`;
code = code.replace(rgEditDiv, "");

const rgPrintDiv = `<div className="w-1/2">
                <span className="text-[10px] uppercase font-black tracking-widest block mb-1">RG</span>
                <div className="border-b-2 border-black font-bold pb-1 text-sm">{novoRg || "__________________"}</div>
              </div>`;
code = code.replace(rgPrintDiv, "");

// In the edit UI, the div holding CPF and RG now only holds CPF.
// Change it to just hold CPF, full width or half width?
code = code.replace(
  `<div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[8px] font-black text-[#8e7164] uppercase block mb-1">CPF</label>
                    <input type="text" value={novoCpf} onChange={e => setNovoCpf(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                  </div>
                  
                </div>`,
  `<div className="w-full">
                    <label className="text-[8px] font-black text-[#8e7164] uppercase block mb-1">CPF</label>
                    <input type="text" value={novoCpf} onChange={e => setNovoCpf(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                  </div>`
);

// In the print UI:
code = code.replace(
  `<div className="flex gap-6">
              <div className="w-1/2">
                <span className="text-[10px] uppercase font-black tracking-widest block mb-1">CPF</span>
                <div className="border-b-2 border-black font-bold pb-1 text-sm">{novoCpf || "__________________"}</div>
              </div>
              
            </div>`,
  `<div>
                <span className="text-[10px] uppercase font-black tracking-widest block mb-1">CPF</span>
                <div className="border-b-2 border-black font-bold pb-1 text-sm">{novoCpf || "__________________"}</div>
              </div>`
);

// ADD CNPJ TO HEADER
const headerPrint = `<h1 className="text-xl font-black uppercase tracking-widest mb-1">STUDIO ACORDE</h1>`;
const newHeaderPrint = `<h1 className="text-xl font-black uppercase tracking-widest mb-1">STUDIO ACORDE</h1>
            <p className="text-[8px] font-bold uppercase tracking-wider mb-2">CNPJ: 55.273.720/0001-12</p>`;
code = code.replace(headerPrint, newHeaderPrint);

// ADD CONTRATO NUMBER LOGIC
// We find "const matricula = aluno.matriculas?.[0];"
// and add "const numeroContrato = (aluno.contratos?.length || 0) + 1;"
code = code.replace(
  `const matricula = aluno.matriculas?.[0];`,
  `const matricula = aluno.matriculas?.[0];\n  const numeroContrato = (aluno.contratos?.length || 0) + 1;`
);

// Now display the contract number in the PRINT HEADER
// It currently says: <p className="text-[10px] uppercase font-bold tracking-widest mb-2">Contrato de Prestação de Serviços Educacionais</p>
code = code.replace(
  `<p className="text-[10px] uppercase font-bold tracking-widest mb-2">Contrato de Prestação de Serviços Educacionais</p>`,
  `<p className="text-[10px] uppercase font-black tracking-widest mb-2">Contrato de Prestação de Serviços Educacionais Nº {String(numeroContrato).padStart(3, '0')}</p>`
);

// SHRINK CSS TO FIT ON ONE PAGE
// Change printRef div styles
code = code.replace(
  `className="bg-white p-8" style={{ width: '800px', fontFamily: 'serif', fontSize: '14px', lineHeight: '1.5', color: '#000', backgroundColor: '#fff' }}`,
  `className="bg-white p-4" style={{ width: '800px', fontFamily: 'serif', fontSize: '10px', lineHeight: '1.2', color: '#000', backgroundColor: '#fff' }}`
);

// Make the clause texts much smaller in print
// <span className="text-[10px] font-black pt-0.5 min-w-[20px]">
code = code.replace(
  `className="text-[10px] font-black pt-0.5 min-w-[20px]"`,
  `className="text-[8px] font-black pt-0.5 min-w-[15px]"`
);

// <p className="text-xs leading-relaxed text-justify">
code = code.replace(
  /className="text-xs leading-relaxed text-justify"/g,
  `className="text-[8px] leading-tight text-justify"`
);

// Less margin bottom for clauses container
code = code.replace(
  `className="flex-1 space-y-3 mb-8"`,
  `className="flex-1 space-y-1 mb-4"`
);

// Less gap in flex container for sections
code = code.replace(
  `className="space-y-6 mb-8"`,
  `className="space-y-3 mb-4"`
);

// Fix dynamic data dictionary (remove RG)
code = code.replace(
  `rg: novoRg,`,
  ``
);

fs.writeFileSync('src/components/GeradorContrato.tsx', code);
console.log('Fixed GeradorContrato.tsx');
