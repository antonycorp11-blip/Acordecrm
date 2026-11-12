import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Check, Copy, Download, Pencil, RotateCcw, Search, BellRing, Upload, ChevronDown, Target } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';

// Remarketing para tablet e PC: abas no topo, lista à esquerda e mensagem à direita
// (no celular/tablet em pé a mensagem fica em cima). Um toque no verde abre o WhatsApp
// com a mensagem pronta; o envio é sempre manual, um por um.

type Aba = 'missao' | 'aula_marcada' | 'em_atendimento' | 'ex_alunos' | 'sem_interesse';
type Grupo = Exclude<Aba, 'missao'>;
type Modelo = { titulo: string; texto: string };

const ABAS: { id: Aba; titulo: string; descricao: string }[] = [
  { id: 'missao', titulo: 'Missão do dia', descricao: 'Contatos antigos do WhatsApp: até 10 por dia, dos mais antigos primeiro. Sem resposta, volta em 3 dias (no máximo 2 tentativas).' },
  { id: 'aula_marcada', titulo: 'Fez aula, não fechou', descricao: 'Marcaram aula experimental e não se matricularam.' },
  { id: 'em_atendimento', titulo: 'Conversou e sumiu', descricao: 'Chamaram, mas pararam de responder há mais de 2 dias.' },
  { id: 'ex_alunos', titulo: 'Ex-alunos', descricao: 'Saíram da escola e não têm dívida.' },
  { id: 'sem_interesse', titulo: 'Disseram não', descricao: 'Marcados como sem interesse.' }
];

// {saudacao} = Bom dia / Boa tarde / Boa noite · {nome} = primeiro nome · {instrumento}
const MODELOS: Record<string, Modelo[]> = {
  missao_1: [
    { titulo: 'Retomar conversa', texto: '{saudacao}! Aqui é do Studio Acorde 🎶 Há um tempo você conversou com a gente sobre aulas de música. Abrimos novos horários e a aula experimental continua gratuita. Quer que eu te mande os horários livres?' },
    { titulo: 'Curta', texto: '{saudacao}! Tudo bem? Aqui é do Studio Acorde 🎶 Ainda tem vontade de aprender música? Temos horários novos essa semana.' },
    { titulo: 'Família', texto: '{saudacao}! Aqui é do Studio Acorde 🎶 Você já falou com a gente sobre aulas de música, para você ou para alguém da família. Ainda faz sentido? Posso te mandar horários e valores.' }
  ],
  missao_2: [
    { titulo: 'Segunda tentativa', texto: '{saudacao}! Passando só mais uma vez 😊 Se ainda quiser conhecer o Studio Acorde, a aula experimental é gratuita e sem compromisso. É só responder com um 👍 que eu te mando os horários.' },
    { titulo: 'Despedida leve', texto: '{saudacao}! Não quero incomodar 😊 Se um dia quiser aprender música, o Studio Acorde está de portas abertas. Fica o convite para uma aula experimental gratuita 🎶' }
  ],
  aula_marcada: [
    { titulo: 'Retomar', texto: '{saudacao}, {nome}! Tudo bem? Como foi a aula de {instrumento}? Ficou alguma dúvida sobre horários ou valores? Consigo segurar um horário para você essa semana.' },
    { titulo: 'Horário livre', texto: '{saudacao}, {nome}! Abriu um horário de {instrumento} que pode combinar com você. Quer que eu reserve antes que alguém pegue?' },
    { titulo: 'Condição especial', texto: '{saudacao}, {nome}! Este mês temos uma condição especial de matrícula para quem já fez a aula experimental. Posso te explicar rapidinho?' }
  ],
  em_atendimento: [
    { titulo: 'Retomar', texto: '{saudacao}, {nome}! Tudo bem? Ficamos de conversar sobre as aulas de {instrumento}. Ainda tem interesse? Posso te mandar os horários livres.' },
    { titulo: 'Aula grátis', texto: '{saudacao}, {nome}! Que tal fazer uma aula experimental de {instrumento} gratuita essa semana, sem compromisso? Me fala o melhor dia e horário.' },
    { titulo: 'Última chamada', texto: '{saudacao}, {nome}! Não quero te incomodar 😊 Se ainda quiser aprender {instrumento}, é só responder que eu te ajudo. Se não for o momento, tudo bem também!' }
  ],
  ex_alunos: [
    { titulo: 'Saudade', texto: '{saudacao}, {nome}! Que saudade de você aqui no Studio Acorde 🎶 Que tal voltar para as aulas de {instrumento}? Temos uma condição especial para ex-alunos.' },
    { titulo: 'Novos horários', texto: '{saudacao}, {nome}! Abrimos novos horários de {instrumento}. Se quiser voltar, consigo te encaixar no horário que for melhor para você.' }
  ],
  sem_interesse: [
    { titulo: 'Novidade', texto: '{saudacao}, {nome}! Passando só para avisar que abrimos novos horários de {instrumento}, com condição especial. Se fizer sentido agora, me chama!' },
    { titulo: 'Convite leve', texto: '{saudacao}, {nome}! Tudo bem? Se um dia quiser começar as aulas de {instrumento}, a aula experimental continua gratuita aqui no Studio Acorde. Fica o convite 🎶' }
  ]
};

const CHAVE = 'acorde_remarketing_v2';
const CHAVE_ENVIADOS = 'acorde_remarketing_enviados';
type Preferencias = { escolhido: Record<string, number>; editados: Record<string, string> };
const lerPreferencias = (): Preferencias => {
  try { return { escolhido: {}, editados: {}, ...JSON.parse(localStorage.getItem(CHAVE) || '{}') }; } catch { return { escolhido: {}, editados: {} }; }
};

type ContatoAntigo = {
  id: number; telefone: string; mes: string; primeira_conversa: string;
  status: string; tentativas: number; pode_contatar: boolean; lead_id: number | null;
};
type Missao = { hoje: string; contatos: ContatoAntigo[]; pendentes: number };

const RESULTADOS: { valor: string; rotulo: string; cor: string }[] = [
  { valor: 'interessado', rotulo: 'Interessado', cor: 'bg-[#25D366] text-[#0b3d1f]' },
  { valor: 'respondeu', rotulo: 'Respondeu', cor: 'bg-[#cfe8ff]' },
  { valor: 'nao_respondeu', rotulo: 'Não respondeu', cor: 'bg-white' },
  { valor: 'nao_quer', rotulo: 'Não quer', cor: 'bg-[#ffe0d6]' },
  { valor: 'numero_invalido', rotulo: 'Nº inválido', cor: 'bg-[#eee]' }
];
const ROTULO_RESULTADO: Record<string, string> = Object.fromEntries(RESULTADOS.map(r => [r.valor, r.rotulo]));

const ehHoje = (iso: string | null) => !!iso && new Date(iso).toDateString() === new Date().toDateString();
const quando = (iso: string | null) => {
  if (!iso) return 'nunca contatado';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d === 0 ? 'contatado hoje' : d === 1 ? 'contatado ontem' : `contatado há ${d} dias`;
};
const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const primeiroNome = (nome: string) => { const p = String(nome || '').trim().split(/\s+/)[0] || ''; return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); };
const formatarTelefone = (t: string) => {
  const d = t.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
};
const nomeMes = (mes: string) => {
  const [a, m] = mes.split('-');
  return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1] || m}/${a}`;
};

export default function Remarketing() {
  const { user } = useAuth();
  const [aba, setAba] = useState<Aba>('missao');
  const [dados, setDados] = useState<Record<Grupo, any[]> | null>(null);
  const [missao, setMissao] = useState<Missao | null>(null);
  const [erroMissao, setErroMissao] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [salvandoId, setSalvandoId] = useState<number | null>(null);
  // contatos antigos para quem a mensagem já foi aberta hoje (fica salvo no aparelho)
  const [abertos, setAbertos] = useState<Set<number>>(() => {
    try { const d = JSON.parse(localStorage.getItem(CHAVE_ENVIADOS) || '{}'); return new Set(d.dia === new Date().toDateString() ? d.ids : []); } catch { return new Set(); }
  });
  const marcarAberto = (id: number) => setAbertos(prev => {
    const novo = new Set(prev).add(id);
    try { localStorage.setItem(CHAVE_ENVIADOS, JSON.stringify({ dia: new Date().toDateString(), ids: [...novo] })); } catch { /* ignora */ }
    return novo;
  });
  // quem foi contatado agora continua na tela com o check até recarregar
  const [contatadosAgora, setContatadosAgora] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState('');
  const [esconderHoje, setEsconderHoje] = useState(true);
  const [prefs, setPrefs] = useState<Preferencias>(lerPreferencias);
  const [editando, setEditando] = useState(false);
  const [tentativaMissao, setTentativaMissao] = useState<1 | 2>(1);

  const carregar = () => apiFetch('/api/remarketing').then(r => (r.ok ? r.json() : null)).then(d => d && setDados(d)).catch(() => toast.error('Não foi possível carregar a lista.'));
  const [carregandoMais, setCarregandoMais] = useState(false);
  const carregarMissao = async (mais = false) => {
    try {
      const r = await apiFetch(`/api/contatos-whatsapp/missao${mais ? '?mais=1' : ''}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Não foi possível carregar a missão.');
      setMissao(d);
      setErroMissao('');
    } catch (e: any) { setErroMissao(e.message || 'Não foi possível carregar a missão.'); }
  };
  useEffect(() => { carregar(); carregarMissao(); }, []);

  // ---------- mensagens ----------
  const chaveModelos = aba === 'missao' ? `missao_${tentativaMissao}` : aba;
  const modelos = MODELOS[chaveModelos];
  const indice = Math.min(prefs.escolhido[chaveModelos] ?? 0, modelos.length - 1);
  const chaveTexto = `${chaveModelos}:${indice}`;
  const textoModelo = prefs.editados[chaveTexto] ?? modelos[indice].texto;

  const salvarPrefs = (p: Preferencias) => { setPrefs(p); try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch { /* ignora */ } };
  const escolherModelo = (i: number) => salvarPrefs({ ...prefs, escolhido: { ...prefs.escolhido, [chaveModelos]: i } });
  const editarTexto = (txt: string) => salvarPrefs({ ...prefs, editados: { ...prefs.editados, [chaveTexto]: txt } });
  const restaurarTexto = () => { const editados = { ...prefs.editados }; delete editados[chaveTexto]; salvarPrefs({ ...prefs, editados }); };

  const montarTexto = (base: string, p?: { nome?: string; instrumento?: string }) => base
    .replace(/\{saudacao\}/g, saudacao())
    .replace(/,\s*\{nome\}/g, p?.nome ? `, ${primeiroNome(p.nome)}` : '')
    .replace(/\{nome\}/g, p?.nome ? primeiroNome(p.nome) : '')
    .replace(/\{instrumento\}/g, p?.instrumento ? String(p.instrumento).toLowerCase() : 'música');

  const textoContatoAntigo = (c: ContatoAntigo) => {
    const chave = `missao_${c.tentativas >= 1 ? 2 : 1}`;
    const i = Math.min(prefs.escolhido[chave] ?? 0, MODELOS[chave].length - 1);
    return montarTexto(prefs.editados[`${chave}:${i}`] ?? MODELOS[chave][i].texto);
  };

  // ---------- missão ----------
  const importarContatos = async () => {
    if (!arquivo) return;
    setImportando(true);
    try {
      const form = new FormData();
      form.append('arquivo', arquivo);
      const r = await apiFetch('/api/contatos-whatsapp/importar', { method: 'POST', body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Falha na importação.');
      toast.success(`${d.importados} importados · ${d.ja_cadastrados} já eram alunos/leads · ${d.repetidos} repetidos · ${d.invalidos} inválidos`);
      setArquivo(null);
      await carregarMissao();
    } catch (e: any) { toast.error(e.message || 'Falha na importação.'); }
    finally { setImportando(false); }
  };

  const registrarResultado = async (contato: ContatoAntigo, resultado: string) => {
    setSalvandoId(contato.id);
    try {
      const r = await apiFetch(`/api/contatos-whatsapp/${contato.id}/resultado`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resultado })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Não foi possível salvar.');
      toast.success(resultado === 'interessado' ? 'Lead criado no Atendimento.' : 'Resultado salvo.');
      await carregarMissao();
    } catch (e: any) { toast.error(e.message || 'Não foi possível salvar.'); }
    finally { setSalvandoId(null); }
  };

  const contatosMissao = missao?.contatos || [];
  const concluidosMissao = contatosMissao.filter(c => !c.pode_contatar).length;
  const proximoMissao = contatosMissao.find(c => c.pode_contatar)?.id;
  const progresso = contatosMissao.length ? Math.round((concluidosMissao / contatosMissao.length) * 100) : 0;

  // ---------- grupos ----------
  const grupo = aba === 'missao' ? null : aba;
  const lista = useMemo(() => {
    if (!grupo) return [];
    const l = (dados?.[grupo] || []).filter(p => !busca || String(p.nome).toLowerCase().includes(busca.toLowerCase()));
    return esconderHoje ? l.filter(p => !ehHoje(p.ultimo_contato) || contatadosAgora.has(`${p.tipo}-${p.id}`)) : l;
  }, [dados, grupo, busca, esconderHoje, contatadosAgora]);
  const contatadosHoje = grupo ? (dados?.[grupo] || []).filter(p => ehHoje(p.ultimo_contato)).length : 0;

  const registrar = async (p: any) => {
    if (!grupo) return;
    try {
      const r = await apiFetch('/api/remarketing/contato', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: p.tipo, ref_id: p.id, grupo }) });
      if (!r.ok) throw new Error();
      const contato = await r.json();
      setContatadosAgora(s => new Set(s).add(`${p.tipo}-${p.id}`));
      const agora = new Date().toISOString();
      setDados(prev => prev ? { ...prev, [grupo]: prev[grupo].map(x => (x.tipo === p.tipo && x.id === p.id ? { ...x, ultimo_contato: agora, contatos: x.contatos + 1 } : x)) } : prev);
      toast.success(`${primeiroNome(p.nome)} marcado(a) como contatado(a)`, {
        action: { label: 'Desfazer', onClick: async () => { await apiFetch(`/api/remarketing/contato/${contato.id}`, { method: 'DELETE' }); carregar(); } }
      });
    } catch { toast.error('Não consegui registrar o contato.'); }
  };

  const copiarTelefones = () => {
    const tel = lista.map(p => p.whatsapp).join('\n');
    navigator.clipboard?.writeText(tel).then(() => toast.success(`${lista.length} telefone(s) copiados`)).catch(() => toast.error('Não consegui copiar.'));
  };

  const baixarCsv = () => {
    const linhas = [['nome', 'whatsapp', 'instrumento', 'dias_parado', 'ultimo_contato'], ...lista.map(p => [p.nome, p.whatsapp, p.instrumento || '', p.dias_parado ?? '', p.ultimo_contato || ''])];
    const csv = linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `remarketing-${grupo}.csv`;
    a.click();
  };

  const testarAviso = async () => {
    const r = await apiFetch('/api/leads/teste-notificacao', { method: 'POST' });
    if (r.ok) toast.success('Aviso de teste enviado. Deve chegar no celular em alguns segundos.');
    else toast.error('Não foi possível enviar o teste.');
  };

  const contagem = (id: Aba) => id === 'missao'
    ? contatosMissao.length - concluidosMissao
    : (dados?.[id] || []).filter(p => !ehHoje(p.ultimo_contato)).length;
  const info = ABAS.find(a => a.id === aba)!;
  const exemplo = grupo ? lista[0] : undefined;

  const botao = 'flex items-center gap-1.5 px-3 py-2.5 border-2 border-black bg-white font-black uppercase text-xs hover:bg-[#fff1e8]';

  return (
    <div className="min-h-full bg-[#1a0f0a] p-3 sm:p-5 text-[#1a0f0a]">
      {/* topo */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="text-white font-black uppercase text-xl sm:text-2xl tracking-tight leading-none">Remarketing</h1>
          <p className="text-[#c9b3a8] text-xs font-bold mt-1">Toque no verde, envie no WhatsApp e volte para registrar.</p>
        </div>
        <button onClick={testarAviso} className="flex items-center gap-2 text-[#c9b3a8] hover:text-white border border-[#5a4034] px-3 py-2 font-bold text-xs">
          <BellRing className="w-4 h-4" /> Testar aviso de lead
        </button>
      </div>

      {/* abas */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-3 px-3 sm:mx-0 sm:px-0" role="tablist">
        {ABAS.map(a => {
          const ativo = aba === a.id;
          return (
            <button key={a.id} role="tab" aria-selected={ativo} onClick={() => { setAba(a.id); setEditando(false); setBusca(''); }}
              className={`shrink-0 flex items-center gap-2 px-4 py-3 border-2 border-black font-black uppercase text-xs sm:text-sm min-h-[52px] ${ativo ? 'bg-[#ff6b00] text-white' : 'bg-[#fff8f6] text-[#1a0f0a] shadow-[3px_3px_0_#000]'}`}>
              {a.id === 'missao' && <Target className="w-4 h-4" />}
              {a.titulo}
              <span className={`min-w-[26px] px-1.5 py-0.5 text-xs text-center ${ativo ? 'bg-black/25' : 'bg-[#1a0f0a] text-white'}`}>{contagem(a.id)}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] items-start">
        {/* painel da mensagem: em cima no celular/tablet em pé, à direita no PC/tablet deitado */}
        <aside className="lg:order-2 lg:sticky lg:top-4 space-y-3">
          <div className="bg-[#fff8f6] border-4 border-black p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-black uppercase text-sm">Mensagem que vai junto</h2>
              <button onClick={() => setEditando(!editando)} className="flex items-center gap-1 text-xs font-black uppercase text-[#ff6b00]"><Pencil className="w-3.5 h-3.5" /> {editando ? 'Pronto' : 'Editar'}</button>
            </div>

            {aba === 'missao' && (
              <div className="grid grid-cols-2 border-2 border-black text-xs font-black uppercase">
                {([1, 2] as const).map(t => (
                  <button key={t} onClick={() => setTentativaMissao(t)} className={`py-2 ${tentativaMissao === t ? 'bg-black text-white' : 'bg-white'}`}>{t}ª tentativa</button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {modelos.map((m, i) => (
                <button key={m.titulo} onClick={() => escolherModelo(i)}
                  className={`px-3 py-2 border-2 border-black text-xs font-black ${i === indice ? 'bg-[#1a0f0a] text-white' : 'bg-white'}`}>
                  {m.titulo}{prefs.editados[`${chaveModelos}:${i}`] ? ' ✎' : ''}
                </button>
              ))}
            </div>

            {editando ? (
              <div className="space-y-1.5">
                <textarea value={textoModelo} onChange={e => editarTexto(e.target.value)} rows={5} className="w-full border-2 border-black p-3 text-base bg-white text-[#1a0f0a]" />
                <p className="text-xs font-bold text-[#6b5448]">Use {'{saudacao}'}, {'{nome}'} e {'{instrumento}'}: o sistema troca sozinho. Fica salvo neste aparelho.</p>
                {prefs.editados[chaveTexto] && <button onClick={restaurarTexto} className="flex items-center gap-1 text-xs font-black uppercase text-[#ff6b00]"><RotateCcw className="w-3 h-3" /> Voltar ao texto original</button>}
              </div>
            ) : (
              <div className="bg-[#dcf8c6] border-2 border-black p-3 text-[15px] leading-snug whitespace-pre-wrap">
                {montarTexto(textoModelo, exemplo)}
                <p className="text-[11px] font-bold text-[#4d6b3c] mt-2">{exemplo ? `Exemplo com ${primeiroNome(exemplo.nome)}` : aba === 'missao' ? `Vai para quem está na ${tentativaMissao}ª tentativa` : 'Prévia'}</p>
              </div>
            )}
          </div>

          {aba === 'missao' && user?.role === 'admin' && (
            <details className="bg-[#fff8f6] border-2 border-black group">
              <summary className="flex items-center justify-between p-3 font-black uppercase text-xs cursor-pointer list-none">
                <span className="flex items-center gap-2"><Upload className="w-4 h-4" /> Importar contatos (CSV)</span>
                <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="p-3 pt-0 space-y-2">
                <input type="file" accept=".csv,text/csv" onChange={e => setArquivo(e.target.files?.[0] || null)} className="text-sm max-w-full" />
                <button onClick={importarContatos} disabled={!arquivo || importando} className="w-full bg-[#ff6b00] text-white border-2 border-black py-2.5 font-black uppercase text-xs disabled:opacity-50">{importando ? 'Importando...' : 'Importar'}</button>
                <p className="text-xs font-bold text-[#6b5448]">Quem já é aluno ou lead fica de fora; reimportar não duplica.</p>
              </div>
            </details>
          )}
        </aside>

        {/* lista */}
        <main className="lg:order-1 space-y-3 min-w-0">
          <p className="text-[#c9b3a8] text-sm font-bold">{info.descricao}</p>

          {aba === 'missao' ? (
            <>
              {missao && contatosMissao.length > 0 && (
                <div className="bg-[#fff8f6] border-4 border-black p-3 flex items-center gap-3">
                  <span className="font-black text-2xl leading-none">{concluidosMissao}/{contatosMissao.length}</span>
                  <div className="flex-1">
                    <div className="h-3 bg-[#eadbd3] border-2 border-black"><div className="h-full bg-[#ff6b00] transition-all" style={{ width: `${progresso}%` }} /></div>
                    <p className="text-xs font-bold text-[#6b5448] mt-1">{progresso === 100 ? 'Missão de hoje concluída! 🎉' : 'concluídos hoje'} · {missao.pendentes} na fila</p>
                  </div>
                </div>
              )}
              {erroMissao && <p className="font-bold text-red-300">{erroMissao}</p>}
              {!missao && !erroMissao && <p className="text-white font-black uppercase text-center py-10">Carregando missão...</p>}
              {missao && contatosMissao.length === 0 && <div className="bg-[#fff8f6] border-4 border-dashed border-[#8e7164] p-10 text-center font-black uppercase">Nenhum número disponível hoje.</div>}

              <div className="space-y-2">
                {[...contatosMissao].sort((a, b) => Number(!a.pode_contatar) - Number(!b.pode_contatar)).map(c => {
                  const numero = c.telefone.length <= 11 ? `55${c.telefone}` : c.telefone;
                  const link = `https://wa.me/${numero}?text=${encodeURIComponent(textoContatoAntigo(c))}`;
                  const aberto = abertos.has(c.id);
                  const proximo = c.id === proximoMissao;
                  const tentativa = Math.min(c.tentativas + (c.pode_contatar ? 1 : 0), 2);
                  if (!c.pode_contatar) {
                    return (
                      <div key={c.id} className="bg-[#3a2820] border-2 border-[#5a4034] px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[#c9b3a8]">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="font-black line-through decoration-1">{formatarTelefone(c.telefone)}</span>
                        <span className="text-xs font-bold">{c.status === 'nao_respondeu' && c.tentativas < 2 ? 'Não respondeu · volta em 3 dias' : ROTULO_RESULTADO[c.status] || 'Concluído'}{c.lead_id ? ' · virou lead' : ''}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={c.id} className={`border-4 p-3 ${aberto ? 'bg-[#eaf9ef] border-[#1f9d55]' : proximo ? 'bg-[#fff8f6] border-[#ff6b00] shadow-[4px_4px_0_#ff6b00]' : 'bg-[#fff8f6] border-black'}`}>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[160px]">
                          <p className="font-black text-lg leading-tight flex items-center gap-2">{formatarTelefone(c.telefone)}
                            {aberto && <span className="inline-flex items-center gap-1 bg-[#1f9d55] text-white text-[11px] font-black uppercase px-2 py-0.5"><Check className="w-3.5 h-3.5" /> Mensagem enviada</span>}</p>
                          <p className="text-xs font-bold text-[#6b5448]">Conversou em {nomeMes(c.mes)} · {tentativa}ª tentativa</p>
                        </div>
                        <a href={link} target="_blank" rel="noopener noreferrer" onClick={() => marcarAberto(c.id)}
                          className={`flex items-center justify-center gap-2 border-4 border-black font-black uppercase text-sm min-h-[52px] px-5 w-full sm:w-auto ${aberto ? 'bg-white text-[#0b3d1f]' : 'bg-[#25D366] text-[#0b3d1f] shadow-[3px_3px_0_#000]'}`}>
                          <MessageCircle className="w-5 h-5" /> {aberto ? 'Abrir de novo' : 'WhatsApp'}
                        </a>
                      </div>
                      {aberto && <p className="mt-2 text-xs font-black text-[#1f9d55]">Agora marque o que aconteceu:</p>}
                      <div className={`mt-2 grid grid-cols-2 sm:grid-cols-5 gap-1.5 ${aberto ? '' : 'opacity-60'}`}>
                        {RESULTADOS.map(r => (
                          <button key={r.valor} onClick={() => registrarResultado(c, r.valor)} disabled={salvandoId !== null}
                            className={`border-2 border-black px-2 py-2.5 font-black text-xs min-h-[44px] disabled:opacity-50 ${r.cor} ${r.valor === 'interessado' ? 'col-span-2 sm:col-span-1' : ''}`}>
                            {salvandoId === c.id ? '...' : r.rotulo}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {missao && missao.pendentes > 0 && (
                <button disabled={carregandoMais} onClick={async () => { setCarregandoMais(true); const antes = contatosMissao.length; await carregarMissao(true); setCarregandoMais(false); toast.success('Mais contatos carregados.'); if (antes === 0) window.scrollTo({ top: 0 }); }}
                  className="w-full flex items-center justify-center gap-2 bg-[#ff6b00] text-white border-4 border-black font-black uppercase text-sm min-h-[56px] shadow-[4px_4px_0_#000] disabled:opacity-60">
                  <RotateCcw className="w-5 h-5" /> {carregandoMais ? 'Carregando...' : 'Carregar mais 10 contatos'}
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 flex-1 min-w-[180px] bg-white border-2 border-black px-3">
                  <Search className="w-5 h-5 text-[#6b5448]" />
                  <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome" className="flex-1 py-2.5 text-base outline-none bg-transparent text-[#1a0f0a]" />
                </label>
                <button onClick={() => setEsconderHoje(!esconderHoje)} className={`${botao} ${esconderHoje ? '!bg-black text-white' : ''}`}>
                  {esconderHoje ? `Ocultando ${contatadosHoje} de hoje` : 'Mostrando todos'}
                </button>
                <button onClick={copiarTelefones} className={botao}><Copy className="w-4 h-4" /> Telefones</button>
                <button onClick={baixarCsv} className={botao}><Download className="w-4 h-4" /> CSV</button>
              </div>

              {!dados ? (
                <p className="text-white font-black uppercase text-center py-10">Carregando...</p>
              ) : lista.length === 0 ? (
                <div className="bg-[#fff8f6] border-4 border-dashed border-[#8e7164] p-10 text-center">
                  <p className="font-black uppercase text-lg">{esconderHoje && contatadosHoje > 0 ? 'Todo mundo deste grupo já foi contatado hoje 💪' : 'Ninguém neste grupo'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                  {lista.map(p => {
                    const link = `https://wa.me/${p.whatsapp}?text=${encodeURIComponent(montarTexto(textoModelo, p))}`;
                    const feito = ehHoje(p.ultimo_contato);
                    return (
                      <div key={`${p.tipo}-${p.id}`} className={`border-4 p-3 flex items-center gap-3 ${feito ? 'bg-[#eaf9ef] border-[#1f9d55]' : 'bg-[#fff8f6] border-black'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-black uppercase leading-tight truncate flex items-center gap-1.5">{feito && <Check className="w-4 h-4 shrink-0 text-[#1f9d55]" strokeWidth={4} />}{p.nome}</p>
                          <p className="text-xs font-bold text-[#6b5448] truncate">
                            {p.instrumento || 'Instrumento não informado'}{p.dias_parado != null ? ` · parado há ${p.dias_parado}d` : ''}
                          </p>
                          <p className={`text-[11px] font-black uppercase ${ehHoje(p.ultimo_contato) ? 'text-emerald-700' : 'text-[#8e7164]'}`}>
                            {quando(p.ultimo_contato)}{p.contatos > 1 ? ` · ${p.contatos} contatos` : ''}
                          </p>
                        </div>
                        <a href={link} target="_blank" rel="noopener noreferrer" onClick={() => registrar(p)}
                          className="flex items-center justify-center gap-2 bg-[#25D366] text-[#0b3d1f] border-4 border-black font-black uppercase text-sm min-h-[52px] px-4 shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none">
                          <MessageCircle className="w-5 h-5" /> <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                        <button onClick={() => !feito && registrar(p)} disabled={feito} title={feito ? 'Já contatado hoje' : 'Marcar como contatado sem abrir o WhatsApp'} aria-label="Marcar como contatado"
                          className={`w-[52px] min-h-[52px] flex items-center justify-center border-4 border-black active:translate-y-0.5 ${feito ? 'bg-[#1f9d55] text-white' : 'bg-white'}`}>
                          <Check className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
