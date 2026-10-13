import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { X, Printer, Plus, Trash2, Edit2, Check, Save, Send, Eye } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';

interface GeradorContratoProps {
  aluno: any;
  isOpen: boolean;
  onClose: () => void;
}

const CLAUSULAS_FALLBACK = [
  "REPOSIÇÕES E REAGENDAMENTOS: A reposição de faltas será concedida exclusivamente mediante apresentação de atestado ou receita médica. Fica permitido o reagendamento de aulas no limite de apenas 1 (uma) vez ao mês.",
  "DA ADESÃO: A assinatura implica ciência e aceitação integral das condições vigentes. Solicitação de cancelamento posterior não afasta as obrigações assumidas.",
  "DA INADIMPLÊNCIA: Atrasos geram multa de 2% e juros de 1% a.m. Após 30 dias inadimplente, as aulas poderão ser suspensas até regularização, sem direito à reposição.",
  "FALTAS PELA ESCOLA: Cancelamentos motivados pela escola ou professor terão reposição integral em data a combinar.",
  "FERIADOS: As aulas que coincidirem com feriados não serão realizadas na data e serão remarcadas para a semana seguinte, prorrogando-se o término do contrato, de forma que o(a) CONTRATANTE receba a totalidade das aulas contratadas.",
  "PORTAL DO ALUNO: Acesso pessoal, intransferível e gratuito a materiais complementares. Sujeito a manutenções técnicas.",
  "CERTIFICADO: A emissão exige conclusão do curso, adimplência financeira e realização das atividades no Portal.",
  "ABANDONO: A ausência injustificada não cancela o contrato. As parcelas seguem devidas até a solicitação formal de cancelamento.",
  "TOLERÂNCIA: Limite de 15 minutos de atraso, sem reposição do tempo perdido, encerrando-se a aula no horário previsto original.",
  "DADOS E IMAGEM: Os dados pessoais são tratados conforme a LGPD (Lei nº 13.709/2018). O uso da imagem e voz do aluno para fins institucionais e de divulgação da escola depende da opção do(a) CONTRATANTE registrada no Termo de Uso de Imagem ao final deste contrato, podendo ser revogada a qualquer tempo por escrito.",
  "EQUIPAMENTOS: O contratante responsabiliza-se pelo ressarcimento de danos aos equipamentos da escola causados por mau uso. Exclui-se o desgaste natural.",
  "RESCISÃO PELO ALUNO: Vigência pelo período contratado. O cancelamento antecipado gera multa rescisória de 20% sobre o saldo das mensalidades restantes, pagável em até 3 dias úteis.",
  "NORMAS E RESCISÃO PELA ESCOLA: Exige-se respeito às normas. Inadimplência, mau comportamento ou danos ao patrimônio podem gerar advertência ou rescisão imediata do contrato pela escola.",
  "PROFESSORES: A escola reserva-se o direito de substituir professores, horários ou alterar metodologias, não justificando cancelamento isento de multa.",
  "FORO: Eleito o foro da Comarca de Cuiabá-MT para dirimir controvérsias judiciais decorrentes deste contrato."
];

export default function GeradorContrato({ aluno, isOpen, onClose }: GeradorContratoProps) {
  if (!isOpen || !aluno) return null;

  const matricula = aluno.matriculas?.[0];
  const numeroContrato = (aluno.contratos?.length || 0) + 1;
  
  const [clausulas, setClausulas] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  
  const [novoResponsavel, setNovoResponsavel] = useState(aluno.responsavel_nome || "");
  const [novoCpf, setNovoCpf] = useState(aluno.responsavel_cpf || aluno.cpf || "");
  
  const [novoEndereco, setNovoEndereco] = useState(aluno.endereco || "");
  const [novoEmail, setNovoEmail] = useState(aluno.email || "");
  
  const [valorPlano, setValorPlano] = useState(matricula?.valor_parcela?.toString() || "370");
  const [qtdParcelas, setQtdParcelas] = useState(matricula?.total_parcelas?.toString() || "6");
  const [diaVencimento, setDiaVencimento] = useState(matricula?.dia_vencimento?.toString() || "10");
  const [cursoNome, setCursoNome] = useState(matricula?.cursos?.nome || "Música");
  const [duracaoAula, setDuracaoAula] = useState(matricula?.pacotes?.duracao_aula_minutos ? `${matricula.pacotes.duracao_aula_minutos} minutos` : "50 minutos");
  const [qtdAulas, setQtdAulas] = useState("1 aula por semana");
  const [formaPagamento, setFormaPagamento] = useState<string>(matricula?.forma_pagamento || "mensal");
  const [parcelasCartao, setParcelasCartao] = useState(matricula?.parcelas_cartao?.toString() || "12");
  const [vigenciaMeses, setVigenciaMeses] = useState(matricula?.vigencia_meses?.toString() || (matricula?.forma_pagamento && matricula.forma_pagamento !== 'mensal' ? "12" : (matricula?.total_parcelas?.toString() || "6")));
  const [totalAulas, setTotalAulas] = useState((matricula?.aulas_total_contrato || matricula?.pacotes?.total_aulas || "").toString());
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const aVista = formaPagamento !== 'mensal';

  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTemplate();
  }, []);

  useEffect(() => {
    if (isOpen && aluno) {
      setNovoResponsavel(aluno.responsavel_nome || "");
      setNovoCpf(aluno.responsavel_cpf || aluno.cpf || "");
      setNovoEndereco(aluno.endereco || "");
      setNovoEmail(aluno.email || "");
      
      const matricula = aluno.matriculas?.[0];
      setValorPlano(matricula?.valor_parcela?.toString() || "370");
      setQtdParcelas(matricula?.total_parcelas?.toString() || "6");
      setDiaVencimento(matricula?.dia_vencimento?.toString() || "10");
      setCursoNome(matricula?.cursos?.nome || "Música");
      setFormaPagamento(matricula?.forma_pagamento || "mensal");
      setParcelasCartao(matricula?.parcelas_cartao?.toString() || "12");
      setVigenciaMeses(matricula?.vigencia_meses?.toString() || (matricula?.forma_pagamento && matricula.forma_pagamento !== 'mensal' ? "12" : (matricula?.total_parcelas?.toString() || "6")));
      setTotalAulas((matricula?.aulas_total_contrato || matricula?.pacotes?.total_aulas || "").toString());
    }
  }, [isOpen, aluno]);

  // Texto do contrato vem do servidor (mesmo gerador usado na Área do Aluno), evitando divergências
  const fetchPreview = async (): Promise<string> => {
    const res = await fetch('/api/contratos/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('acorde_token')}`
      },
      body: JSON.stringify({
        alunoNome: aluno.nome,
        responsavelNome: novoResponsavel,
        cpf: novoCpf,
        endereco: novoEndereco,
        cursoNome,
        duracaoAula,
        qtdAulas,
        valorPlano,
        diaVencimento,
        qtdParcelas: aVista ? 1 : qtdParcelas,
        formaPagamento,
        parcelasCartao,
        totalAulas,
        vigenciaMeses,
        clausulas: clausulas.length > 0 ? clausulas : CLAUSULAS_FALLBACK
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.html) {
      throw new Error(data.error || (res.status === 404 ? 'Servidor desatualizado (rota de prévia não encontrada).' : `Erro ${res.status} ao gerar o contrato.`));
    }
    return data.html;
  };

  useEffect(() => {
    if (clausulas.length === 0) return;
    const timer = setTimeout(async () => {
      try {
        setPreviewHtml(await fetchPreview());
        setPreviewError("");
      } catch (e: any) {
        console.warn('[GeradorContrato] Erro ao gerar prévia:', e);
        setPreviewError(e?.message || 'Erro ao gerar o contrato.');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [clausulas, novoResponsavel, novoCpf, novoEndereco, cursoNome, duracaoAula, qtdAulas, valorPlano, diaVencimento, qtdParcelas, formaPagamento, parcelasCartao, totalAulas, vigenciaMeses]);

  // Garante o texto atualizado antes de imprimir/visualizar/enviar
  const ensurePreview = async (): Promise<string | null> => {
    try {
      const html = await fetchPreview();
      flushSync(() => {
        setPreviewHtml(html);
        setPreviewError("");
      });
      return html;
    } catch (e: any) {
      const msg = e?.message || 'Erro ao gerar o contrato.';
      setPreviewError(msg);
      toast.error(`Não foi possível gerar o contrato: ${msg}`);
      return null;
    }
  };

  const fetchTemplate = async () => {
    try {
      const res = await fetch('/api/contratos/template', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('acorde_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.clausulas && data.clausulas.length > 0) {
          setClausulas(data.clausulas);
          return;
        }
      }
      setClausulas(CLAUSULAS_FALLBACK);
    } catch (error) {
      setClausulas(CLAUSULAS_FALLBACK);
    }
  };

  const saveTemplate = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contratos/template', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('acorde_token')}`
        },
        body: JSON.stringify({ clausulas })
      });
      if (res.ok) toast.success("Template de contrato salvo com sucesso!");
      else toast.error("Erro ao salvar template");
    } catch (e) {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  const generateHtml = () => {
    if (!printRef.current) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = printRef.current.innerHTML;
    // Forçar exibição para capturar o HTML
    tempDiv.style.display = 'block';
    return tempDiv.innerHTML;
  };

  const printContrato = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Contrato_${aluno.nome.replace(/\s+/g, '_')}`,
  });

  const handlePrintPdf = async () => {
    const html = await ensurePreview();
    if (html) printContrato();
  };

  const handleVerContrato = async () => {
    const html = await ensurePreview();
    if (html) setShowPreview(true);
  };

  const handleSendEmail = async () => {
    if (!novoEmail) return toast.error("Preencha o e-mail do aluno para enviar.");
    
    const conteudo_html = await ensurePreview();
    if (!conteudo_html) return;

    const dados_dinamicos = {
      responsavel: novoResponsavel,
      cpf: novoCpf,
      endereco: novoEndereco,
      cursoNome,
      valorPlano,
      qtdParcelas: aVista ? 1 : qtdParcelas,
      diaVencimento,
      duracaoAula,
      qtdAulas,
      formaPagamento,
      parcelasCartao: formaPagamento === 'cartao_credito' ? parcelasCartao : null,
      totalAulas,
      vigenciaMeses
    };

    try {
      setIsSending(true);
      const res = await fetch('/api/contratos/enviar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('acorde_token')}`
        },
        body: JSON.stringify({
          aluno_id: aluno.id,
          email_aluno: novoEmail,
          dados_dinamicos,
          conteudo_html
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Contrato enviado por e-mail com sucesso!");
        onClose();
      } else {
        toast.error("Erro ao enviar: " + (data.error || "Desconhecido"));
      }
    } catch (e) {
      toast.error("Erro de conexão ao enviar contrato.");
    } finally {
      setIsSending(false);
    }
  };

  const saveEdit = (index: number) => {
    const novas = [...clausulas];
    novas[index] = editText;
    setClausulas(novas);
    setEditingIndex(null);
  };

  const removeClause = (index: number) => {
    setClausulas(clausulas.filter((_, i) => i !== index));
  };

  const addClause = () => {
    setClausulas([...clausulas, "Nova cláusula (clique para editar)"]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      
      <div className="bg-[#fff8f6] w-[95%] max-w-6xl max-h-[90vh] border-4 border-black shadow-[8px_8px_0_#000] overflow-hidden flex flex-col">
        <div className="p-4 md:p-6 border-b-4 border-black flex flex-wrap items-center justify-between shrink-0 bg-[#feccba] gap-4">
          <div>
            <h2 className="text-xl font-black text-black uppercase italic tracking-tighter">Gerador de Contrato</h2>
            <p className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest">Personalize e emita o contrato para {aluno.nome}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handleVerContrato}
              className="bg-white text-black px-4 py-2 border-2 border-black font-black uppercase text-[10px] shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none flex items-center gap-2"
            >
              <Eye className="w-3 h-3" /> VER CONTRATO
            </button>
            <button 
              onClick={handlePrintPdf}
              className="bg-[#261812] text-white px-4 py-2 border-2 border-black font-black uppercase text-[10px] shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none flex items-center gap-2"
            >
              <Printer className="w-3 h-3" /> GERAR PDF
            </button>
            <button 
              onClick={handleSendEmail} disabled={isSending}
              className="bg-[#ff6b00] text-white px-4 py-2 border-2 border-black font-black uppercase text-[10px] shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3 h-3" /> {isSending ? 'ENVIANDO...' : 'ENVIAR POR E-MAIL'}
            </button>
            <button onClick={onClose} className="bg-white border-2 border-black p-1.5 shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none">
              <X className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8 bg-[#1a0f0a] flex flex-col md:flex-row gap-6 custom-scrollbar">
          
          <div className="w-full md:w-1/3 flex flex-col gap-6">
            <div className="bg-[#fff8f6] p-4 border-4 border-black shadow-[4px_4px_0_#000]">
              <h3 className="text-[10px] font-black text-black uppercase tracking-widest mb-4 border-b-2 border-black pb-2">DADOS DO ALUNO / RESPONSÁVEL</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">Responsável Legal</label>
                  <input type="text" value={novoResponsavel} onChange={e => setNovoResponsavel(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                </div>
                <div className="w-full">
                    <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">CPF</label>
                    <input type="text" value={novoCpf} onChange={e => setNovoCpf(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                  </div>
                <div>
                  <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">E-mail (Para Envio do Contrato)</label>
                  <input type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">Endereço</label>
                  <input type="text" value={novoEndereco} onChange={e => setNovoEndereco(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                </div>
              </div>
            </div>

            <div className="bg-[#fff8f6] p-4 border-4 border-black shadow-[4px_4px_0_#000]">
              <h3 className="text-[10px] font-black text-black uppercase tracking-widest mb-4 border-b-2 border-black pb-2">CURSO E FINANCEIRO</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">Curso Matriculado</label>
                  <input type="text" value={cursoNome} onChange={e => setCursoNome(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">Duração da Aula</label>
                    <input type="text" value={duracaoAula} onChange={e => setDuracaoAula(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">Qtd na Semana</label>
                    <input type="text" value={qtdAulas} onChange={e => setQtdAulas(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">Total de Aulas</label>
                    <input type="number" value={totalAulas} onChange={e => setTotalAulas(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">Vigência (Meses)</label>
                    <input type="number" value={vigenciaMeses} onChange={e => setVigenciaMeses(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">Forma de Pagamento</label>
                  <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]">
                    <option value="mensal">Mensalidades</option>
                    <option value="cartao_credito">À vista – Cartão de crédito (parcelado na fatura)</option>
                    <option value="pix">À vista – PIX</option>
                    <option value="dinheiro">À vista – Dinheiro</option>
                  </select>
                </div>
                {aVista ? (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">Valor Total</label>
                    <input type="text" value={valorPlano} onChange={e => setValorPlano(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                  </div>
                  {formaPagamento === 'cartao_credito' && (
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">Parcelas no Cartão</label>
                      <input type="number" min={1} value={parcelasCartao} onChange={e => setParcelasCartao(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                    </div>
                  )}
                </div>
                ) : (
                <div className="flex gap-2">
                  <div className="w-1/3">
                    <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">Mensalidade</label>
                    <input type="text" value={valorPlano} onChange={e => setValorPlano(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                  </div>
                  <div className="w-1/3">
                    <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">Parcelas</label>
                    <input type="text" value={qtdParcelas} onChange={e => setQtdParcelas(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                  </div>
                  <div className="w-1/3">
                    <label className="text-[10px] font-black text-[#8e7164] uppercase block mb-1">Dia Venc.</label>
                    <input type="text" value={diaVencimento} onChange={e => setDiaVencimento(e.target.value)} className="w-full px-2 py-1.5 bg-white border-2 border-black font-black text-xs text-black outline-none focus:bg-[#ffeae1]" />
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-full md:w-2/3 bg-[#fff8f6] p-4 md:p-6 border-4 border-black shadow-[4px_4px_0_#000] flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
              <h3 className="text-[10px] font-black text-black uppercase tracking-widest">Cláusulas Contratuais</h3>
              <div className="flex gap-3">
                <button onClick={addClause} className="text-[9px] font-black text-[#ff6b00] flex items-center gap-1 hover:underline">
                  <Plus className="w-3 h-3" /> ADD_ITEM
                </button>
                <button onClick={saveTemplate} disabled={loading} className="text-[9px] font-black text-black flex items-center gap-1 hover:underline">
                  <Save className="w-3 h-3" /> SALVAR_PADRÃO
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto pr-2 space-y-3 custom-scrollbar">
              {clausulas.map((clausula, idx) => (
                <div key={idx} className="group relative border-2 border-black p-3 bg-white shadow-[2px_2px_0_#000]">
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setEditingIndex(idx); setEditText(clausula); }} className="p-1 bg-black text-white border border-black"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => removeClause(idx)} className="p-1 bg-red-500 text-white border border-black"><Trash2 className="w-3 h-3" /></button>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-black text-[#ff6b00] pt-0.5">{idx + 1}.</span>
                    {editingIndex === idx ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <textarea 
                          value={editText} 
                          onChange={e => setEditText(e.target.value)} 
                          className="w-full text-xs font-black p-2 border-2 border-black outline-none bg-[#ffeae1]"
                          rows={4}
                        />
                        <button onClick={() => saveEdit(idx)} className="self-end px-3 py-1 bg-black text-white text-[9px] font-black uppercase flex items-center gap-1">
                          <Check className="w-3 h-3" /> OK
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-black text-black leading-relaxed uppercase">{clausula}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {previewError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white border-2 border-black px-4 py-2 text-[10px] font-black uppercase shadow-[4px_4px_0_#000] z-[101]">
          Erro ao gerar contrato: {previewError}
        </div>
      )}

      {/* Visualização do contrato completo */}
      {showPreview && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white w-full max-w-4xl max-h-[90vh] border-4 border-black shadow-[8px_8px_0_#000] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b-4 border-black bg-[#feccba] shrink-0">
              <h3 className="text-sm font-black text-black uppercase">Contrato completo – {aluno.nome}</h3>
              <div className="flex gap-2">
                <button onClick={handlePrintPdf} className="bg-[#261812] text-white px-3 py-1.5 border-2 border-black font-black uppercase text-[10px] flex items-center gap-1">
                  <Printer className="w-3 h-3" /> GERAR PDF
                </button>
                <button onClick={() => setShowPreview(false)} className="bg-white border-2 border-black p-1.5">
                  <X className="w-4 h-4 text-black" />
                </button>
              </div>
            </div>
            <div className="overflow-auto custom-scrollbar" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      )}

      {/* Conteúdo Oculto para Geração de PDF e Captura HTML */}
      <div className="fixed opacity-0 pointer-events-none z-[-1]">
        <div ref={printRef} className="bg-white" style={{ width: '800px', color: '#000', backgroundColor: '#fff' }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>

    </div>
  );
}
