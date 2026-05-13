import React, { useState } from 'react';
import { X, Printer, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GeradorContratoProps {
  aluno: any;
  onClose: () => void;
}

const CLAUSULAS_PADRAO = [
  "O objeto do presente instrumento é a prestação, pela CONTRATADA, em favor do(a) CONTRATANTE, dos serviços de ensino de música (CNAE 8592-9/03), por meio de aulas de música e prática de instrumentos.",
  "Pelo presente instrumento, o(a) CONTRATANTE opta pela aquisição de um pacote de aulas, os quais serão cumpridos ao longo dos meses acordados.",
  "As aulas são intransferíveis, individuais, ministradas 1 vez por semana, com duração de 50 a 60 minutos e agendada conforme interesse do aluno e disponibilidade de horário do Professor.",
  "É obrigação do(a) CONTRATANTE comunicar, com antecedência mínima de 3 (três) horas, a impossibilidade de comparecer à aula previamente agendada. Caso o(a) CONTRATANTE não compareça a aula e não comunique a sua ausência a Escola, computar-se-á a aula no pacote do(a) CONTRATANTE.",
  "As aulas são previamente agendadas, sendo responsabilidade do aluno cumprir os dias e horários combinados; durante a vigência deste contrato, o aluno terá direito a até 8 (oito) reposições gratuitas, desde que a solicitação seja feita em até 3 (três) dias após a falta.",
  "A tolerancia em relação ao atraso não comunicado referente ao horário da aula é de 20 minutos. Após o prazo estipulado, não havendo comunicação ficará como aula dada.",
  "O aluno terá direito a um desconto automático de R$ 100,00 (cem reais) no valor da mensalidade, caso o pagamento seja efetuado até o dia 10 (dez) do mês vigente; após essa data, a mensalidade será cobrada integralmente.",
  "O aluno deve pagar normalmente as mensalidades durante o recesso escolar. As faltas em aula, independentemente da quantidade, não isentam o pagamento.",
  "Em caso de atraso no pagamento por mais de 05 dias, as aulas do(a) CONTRATANTE serão suspensas até a liquidação das pendências financeiras.",
  "Os professores do Studio Acorde não possuem vínculo CLT, podendo haver substituições por motivos administrativos ou de disponibilidade. A troca de professor não constitui motivo para rescisão sem multa.",
  "Desde a matrícula, o aluno está sujeito a todas as condições deste contrato, independentemente do tempo de permanência.",
  "Pelo presente instrumento, o(a) CONTRATANTE cede em favor da CONTRATADA os direitos de utilização de sua imagem e voz em eventos da escola.",
  "As reposições serão marcadas conforme a disponibilidade da escola, cabendo ao aluno escolher entre os horários oferecidos. Se o aluno faltar à reposição, não haverá nova reposição.",
  "O Studio Acorde poderá rescindir o contrato a qualquer momento, sem multa ou ônus ao aluno.",
  "Se o aluno cancelar o contrato, perde o direito às reposições pendentes, sem reembolso ou compensação.",
  "No caso de desfazimento antecipado, haverá a incidência de multa contratual no percentual de 20% (vinte por cento) sobre o valor do saldo vincendo do contrato que deve ser paga em até 03 dias uteis apos o informe de cancelamento."
];

export default function GeradorContrato({ aluno, onClose }: GeradorContratoProps) {
  const [clausulas, setClausulas] = useState(CLAUSULAS_PADRAO);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [novoResponsavel, setNovoResponsavel] = useState(aluno.responsavel_nome || "");
  const [novoCpf, setNovoCpf] = useState(aluno.cpf || "");
  const [novoRg, setNovoRg] = useState("");
  const [novoEndereco, setNovoEndereco] = useState(aluno.endereco || "");
  const [valorPlano, setValorPlano] = useState("370,00");
  const [qtdParcelas, setQtdParcelas] = useState("6");
  
  const handlePrint = () => {
    window.print();
  };

  const saveEdit = (index: number) => {
    const novas = [...clausulas];
    novas[index] = editText;
    setClausulas(novas);
    setEditingIndex(null);
  };

  const removeClause = (index: number) => {
    const novas = clausulas.filter((_, i) => i !== index);
    setClausulas(novas);
  };

  const addClause = () => {
    setClausulas([...clausulas, "Nova cláusula (clique para editar)"]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm print:bg-white print:z-0 print:block print:inset-auto print:static">
      
      {/* Container de Edição (não visível na impressão) */}
      <div className="bg-white w-[95%] max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col print:hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-900">Gerador de Contrato</h2>
            <p className="text-sm font-medium text-slate-500">Personalize e emita o contrato para {aluno.nome}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/30 flex items-center gap-2 hover:scale-105 transition-all"
            >
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-slate-100/50 flex gap-8 custom-scrollbar">
          {/* Painel Esquerdo: Dados Variáveis */}
          <div className="w-1/3 space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Dados do Contratante</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Responsável Legal</label>
                  <input type="text" value={novoResponsavel} onChange={e => setNovoResponsavel(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">CPF</label>
                  <input type="text" value={novoCpf} onChange={e => setNovoCpf(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">RG</label>
                  <input type="text" value={novoRg} onChange={e => setNovoRg(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Endereço</label>
                  <input type="text" value={novoEndereco} onChange={e => setNovoEndereco(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Dados Financeiros</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Valor do Plano (R$)</label>
                  <input type="text" value={valorPlano} onChange={e => setValorPlano(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Quantidade de Parcelas</label>
                  <input type="text" value={qtdParcelas} onChange={e => setQtdParcelas(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" />
                </div>
              </div>
            </div>
          </div>

          {/* Painel Direito: Cláusulas */}
          <div className="w-2/3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Cláusulas Contratuais</h3>
              <button onClick={addClause} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            
            <div className="flex-1 overflow-auto pr-2 space-y-3">
              {clausulas.map((clausula, idx) => (
                <div key={idx} className="group relative border border-slate-100 p-3 rounded-xl hover:border-primary/30 transition-all bg-slate-50/50">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setEditingIndex(idx); setEditText(clausula); }} className="p-1.5 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => removeClause(idx)} className="p-1.5 bg-red-100 text-red-600 rounded-md hover:bg-red-200"><Trash2 className="w-3 h-3" /></button>
                  </div>
                  <span className="text-xs font-black text-slate-400 mr-2">{idx + 1}.</span>
                  {editingIndex === idx ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <textarea 
                        value={editText} 
                        onChange={e => setEditText(e.target.value)} 
                        className="w-full text-xs p-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        rows={3}
                      />
                      <button onClick={() => saveEdit(idx)} className="self-end px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                        <Check className="w-3 h-3" /> Salvar
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-slate-600 leading-relaxed">{clausula}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Visão de Impressão (Somente visível quando imprime) */}
      <div className="hidden print:block w-full max-w-[800px] mx-auto p-8 font-serif text-[12px] leading-snug text-black bg-white">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold uppercase">Studio Acorde</h1>
          <h2 className="text-lg font-bold uppercase mt-1">Contrato de Prestação de Serviço</h2>
          <p className="mt-2 text-sm">{format(new Date(), 'yyyy')}</p>
        </div>

        <div className="text-justify mb-6 space-y-4">
          <p>
            <strong>CONTRATADA:</strong> STUDIO ACORDE ESCOLA DE MUSICA LTDA, pessoa jurídica de direito privado, regularmente inscrita no CNPJ/MF sob o n.º 55.273.720/0001-12, com sede à AV NEWTON RABELLO, número 26, Pedra 90, CEP 78.099-005 em Cuiabá; neste ato, representado por seu administrador, AQUILLES ANTONY SANTIAGO SANTOS.
          </p>
          <p>
            <strong>CONTRATANTE:</strong> {aluno.nome}, menor impúbere, neste ato, representado pelo(a) Responsável/Contratante, <strong>{novoResponsavel || '_____________________________________'}</strong>, portador(a) da carteira de identidade RG de n.º <strong>{novoRg || '___________'}</strong>, inscrito(a) no CPF/MF sob o n.º <strong>{novoCpf || '_________________'}</strong>, residente e domiciliado à <strong>{novoEndereco || '_____________________________________'}</strong>.
          </p>
          <p>
            As partes acima qualificadas têm entre si, justo e contratado, o presente contrato de prestação de serviços de ensino de música, o qual se regerá pelas seguintes cláusulas e condições:
          </p>
        </div>

        <div className="text-justify space-y-3 mb-8">
          {clausulas.map((c, i) => (
            <p key={i}><strong>{i + 1}.</strong> {c}</p>
          ))}
          <p><strong>{clausulas.length + 1}.</strong> Em contrapartida aos serviços prestados, o(a) CONTRATANTE pagará em favor da CONTRATADA o valor certo e ajustado de R$ {valorPlano}, os quais serão pagos em {qtdParcelas} parcelas iguais e sucessivas, sendo que a primeira vencerá no dia {format(new Date(), 'dd')} de {format(new Date(), 'MMMM', { locale: ptBR })} de {format(new Date(), 'yyyy')}.</p>
        </div>

        <div className="text-justify mb-12">
          <p>E assim, por estarem justas e contratadas, as partes assinam o presente em duas (02) vias de igual teor, valor e forma, após lido e achado conforme.</p>
          <p className="mt-4 text-right">Cuiabá - MT, {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>

        <div className="flex justify-between items-end mt-16 pt-16 px-8 text-center">
          <div className="w-[45%] border-t border-black pt-2">
            <p className="font-bold">AQUILLES ANTONY SANTIAGO SANTOS</p>
            <p className="text-xs">CONTRATADA</p>
          </div>
          <div className="w-[45%] border-t border-black pt-2">
            <p className="font-bold uppercase">{novoResponsavel || "RESPONSÁVEL LEGAL"}</p>
            <p className="text-xs">CONTRATANTE</p>
          </div>
        </div>
        
        <div className="mt-16 text-center text-[10px] text-gray-500 border-t border-gray-200 pt-4">
          AV NEWTON RABELLO, 26 - SALA 6 - Pedra 90 - Cuiabá - 78.099-005<br/>
          E-mail: studio.acorde01@gmail.com | Fones: (65) 99609-1067
        </div>
      </div>

    </div>
  );
}
