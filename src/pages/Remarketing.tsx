import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Check, Copy, Download, Pencil, RotateCcw, Search, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';

// Remarketing pensado para TABLET: um toque no botão verde abre o WhatsApp da pessoa
// com a mensagem pronta e já registra o contato.

type Grupo = 'aula_marcada' | 'em_atendimento' | 'sem_interesse' | 'ex_alunos';

const GRUPOS: { id: Grupo; titulo: string; descricao: string }[] = [
  { id: 'aula_marcada', titulo: 'Fez aula e não fechou', descricao: 'Marcaram aula experimental e não se matricularam' },
  { id: 'em_atendimento', titulo: 'Conversou e sumiu', descricao: 'Chamaram, mas pararam de responder (há mais de 2 dias)' },
  { id: 'ex_alunos', titulo: 'Ex-alunos', descricao: 'Saíram da escola e não têm dívida' },
  { id: 'sem_interesse', titulo: 'Disseram não', descricao: 'Marcados como sem interesse' }
];

const MENSAGENS_PADRAO: Record<Grupo, string> = {
  aula_marcada: 'Oi, {nome}! Tudo bem? Ficou alguma dúvida depois da aula de {instrumento}? Abrimos novos horários este mês. Quer que eu reserve um para você?',
  em_atendimento: 'Oi, {nome}! Ainda pensando em aprender {instrumento}? Abrimos novos horários e a aula experimental é gratuita. Quer agendar essa semana?',
  ex_alunos: 'Oi, {nome}! Que saudade de você aqui na Studio Acorde 🎶 Estamos com uma condição especial para quem volta. Posso te contar?',
  sem_interesse: 'Oi, {nome}! Passando para avisar que abrimos novas turmas de {instrumento} com condição especial. Se fizer sentido agora, me chama!'
};

const CHAVE_MSG = 'acorde_remarketing_mensagens';
const CHAVE_MSG_ANTIGOS = 'acorde_mensagem_contatos_antigos';
const MENSAGEM_ANTIGOS = 'Oi! Aqui é da Studio Acorde 🎶 Você já conversou com a gente sobre aulas de música. Ainda tem interesse em conhecer nossos horários?';

type ContatoAntigo = {
  id: number; telefone: string; mes: string; primeira_conversa: string;
  status: string; tentativas: number; pode_contatar: boolean; lead_id: number | null;
};
type Missao = { hoje: string; contatos: ContatoAntigo[]; pendentes: number };

const ROTULOS_RESULTADO: Record<string, string> = {
  respondeu: 'Respondeu', nao_respondeu: 'Não respondeu', interessado: 'Interessado',
  nao_quer: 'Não quer', numero_invalido: 'Número inválido'
};

const lerMensagens = (): Record<Grupo, string> => {
  try { return { ...MENSAGENS_PADRAO, ...JSON.parse(localStorage.getItem(CHAVE_MSG) || '{}') }; } catch { return MENSAGENS_PADRAO; }
};

const ehHoje = (iso: string | null) => !!iso && new Date(iso).toDateString() === new Date().toDateString();
const quando = (iso: string | null) => {
  if (!iso) return 'nunca contatado';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d === 0 ? 'contatado hoje' : d === 1 ? 'contatado ontem' : `contatado há ${d} dias`;
};

export default function Remarketing() {
  const { user } = useAuth();
  const [dados, setDados] = useState<Record<Grupo, any[]> | null>(null);
  const [missao, setMissao] = useState<Missao | null>(null);
  const [erroMissao, setErroMissao] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [salvandoId, setSalvandoId] = useState<number | null>(null);
  const [mensagemAntigos, setMensagemAntigos] = useState(() => localStorage.getItem(CHAVE_MSG_ANTIGOS) || MENSAGEM_ANTIGOS);
  const [grupo, setGrupo] = useState<Grupo>('aula_marcada');
  const [busca, setBusca] = useState('');
  const [esconderHoje, setEsconderHoje] = useState(true);
  const [mensagens, setMensagens] = useState<Record<Grupo, string>>(lerMensagens);
  const [editando, setEditando] = useState(false);

  const carregar = () => apiFetch('/api/remarketing').then(r => (r.ok ? r.json() : null)).then(d => d && setDados(d)).catch(() => toast.error('Não foi possível carregar a lista.'));
  const carregarMissao = async () => {
    try {
      const r = await apiFetch('/api/contatos-whatsapp/missao');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Não foi possível carregar a missão.');
      setMissao(d);
      setErroMissao('');
    } catch (e: any) { setErroMissao(e.message || 'Não foi possível carregar a missão.'); }
  };
  useEffect(() => { carregar(); carregarMissao(); }, []);

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
      toast.success(resultado === 'interessado' ? 'Lead criado para atendimento.' : 'Resultado salvo.');
      await carregarMissao();
    } catch (e: any) { toast.error(e.message || 'Não foi possível salvar.'); }
    finally { setSalvandoId(null); }
  };

  const mesesMissao = Object.entries((missao?.contatos || []).reduce<Record<string, ContatoAntigo[]>>((acc, c) => {
    (acc[c.mes] ||= []).push(c);
    return acc;
  }, {}));
  const concluidosMissao = (missao?.contatos || []).filter(c => !c.pode_contatar).length;

  const lista = useMemo(() => {
    const l = (dados?.[grupo] || []).filter(p => !busca || p.nome.toLowerCase().includes(busca.toLowerCase()));
    return esconderHoje ? l.filter(p => !ehHoje(p.ultimo_contato)) : l;
  }, [dados, grupo, busca, esconderHoje]);

  const contatadosHoje = (dados?.[grupo] || []).filter(p => ehHoje(p.ultimo_contato)).length;

  const textoPara = (p: any) => {
    const primeiro = String(p.nome).trim().split(/\s+/)[0] || '';
    const nome = primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase();
    return mensagens[grupo]
      .replace(/\{nome\}/g, nome)
      .replace(/\{instrumento\}/g, p.instrumento ? String(p.instrumento).toLowerCase() : 'música');
  };

  const registrar = async (p: any) => {
    try {
      const r = await apiFetch('/api/remarketing/contato', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: p.tipo, ref_id: p.id, grupo }) });
      if (!r.ok) throw new Error();
      const contato = await r.json();
      const agora = new Date().toISOString();
      setDados(prev => prev ? { ...prev, [grupo]: prev[grupo].map(x => (x.tipo === p.tipo && x.id === p.id ? { ...x, ultimo_contato: agora, contatos: x.contatos + 1 } : x)) } : prev);
      const primeiro = String(p.nome).trim().split(/\s+/)[0] || '';
      toast.success(`${primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase()} marcado(a) como contatado(a)`, {
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

  const salvarMensagem = (txt: string) => {
    const novas = { ...mensagens, [grupo]: txt };
    setMensagens(novas);
    try { localStorage.setItem(CHAVE_MSG, JSON.stringify(novas)); } catch { /* ignora */ }
  };

  const testarAviso = async () => {
    const r = await apiFetch('/api/leads/teste-notificacao', { method: 'POST' });
    if (r.ok) toast.success('Aviso de teste enviado. Deve chegar no celular em alguns segundos.');
    else toast.error('Não foi possível enviar o teste.');
  };

  const info = GRUPOS.find(g => g.id === grupo)!;

  return (
    <div className="min-h-full bg-[#1a0f0a] p-3 sm:p-5 text-[#1a0f0a]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-white font-black uppercase text-xl sm:text-2xl tracking-tight">Remarketing</h1>
        <button onClick={testarAviso} className="flex items-center gap-2 bg-white border-2 border-black px-4 py-3 font-black uppercase text-xs shadow-[3px_3px_0_#ff6b00]">
          <BellRing className="w-4 h-4" /> Testar aviso de lead no celular
        </button>
      </div>

      <section className="bg-[#fff8f6] border-4 border-black p-3 sm:p-5 mb-5 space-y-4" aria-label="Missão do dia">
        <div>
          <h2 className="font-black uppercase text-xl">Missão do dia · contatos antigos</h2>
          <p className="font-bold text-sm text-[#6b5448]">Até 10 números por dia, dos meses mais antigos primeiro. Abra cada conversa e registre o resultado. Sem resposta: nova tentativa após 3 dias, no máximo 2 vezes.</p>
          {missao && <p className="font-black mt-1">{concluidosMissao}/{missao.contatos.length} concluídos hoje</p>}
        </div>
        {user?.role === 'admin' && (
          <div className="border-2 border-black bg-white p-3 flex flex-wrap items-center gap-2">
            <label className="font-black text-sm" htmlFor="csv-contatos">Importar CSV:</label>
            <input id="csv-contatos" type="file" accept=".csv,text/csv" onChange={e => setArquivo(e.target.files?.[0] || null)} className="text-sm text-[#1a0f0a] max-w-full" />
            <button onClick={importarContatos} disabled={!arquivo || importando} className="bg-[#ff6b00] border-2 border-black px-4 py-2 font-black disabled:opacity-50">{importando ? 'Importando...' : 'Importar'}</button>
          </div>
        )}
        <label className="block font-black text-sm" htmlFor="mensagem-contatos-antigos">Mensagem pronta (edite antes de abrir o WhatsApp)</label>
        <textarea id="mensagem-contatos-antigos" value={mensagemAntigos} onChange={e => { setMensagemAntigos(e.target.value); localStorage.setItem(CHAVE_MSG_ANTIGOS, e.target.value); }} rows={2} className="w-full border-2 border-black bg-white text-[#1a0f0a] p-3 text-base" />
        {erroMissao && <p className="font-bold text-red-700">{erroMissao}</p>}
        {!missao && !erroMissao && <p className="font-bold">Carregando missão...</p>}
        {missao?.contatos.length === 0 && <p className="font-bold">Nenhum número disponível. Importe o CSV para começar.</p>}
        {mesesMissao.map(([mes, contatos]) => (
          <div key={mes} className="space-y-2">
            <h3 className="font-black uppercase border-b-2 border-black">{mes.slice(5)}/{mes.slice(0, 4)}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contatos.map(c => {
                const numero = c.telefone.length <= 11 ? `55${c.telefone}` : c.telefone;
                const link = `https://wa.me/${numero}?text=${encodeURIComponent(mensagemAntigos)}`;
                return <div key={c.id} className="border-2 border-black bg-white p-3 space-y-2">
                  <p className="font-black text-lg">{c.telefone}</p>
                  <p className="text-sm font-bold text-[#6b5448]">Primeira conversa: {c.primeira_conversa.split('-').reverse().join('/')} · tentativa {Math.min(c.tentativas + (c.pode_contatar ? 1 : 0), 2)}/2</p>
                  {c.pode_contatar ? <>
                    <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-[#25D366] text-[#0b3d1f] border-2 border-black p-3 font-black text-base min-h-[54px]"><MessageCircle className="w-5 h-5" /> Abrir WhatsApp</a>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(ROTULOS_RESULTADO).map(([valor, rotulo]) => <button key={valor} onClick={() => registrarResultado(c, valor)} disabled={salvandoId !== null}
                        className="border-2 border-black px-3 py-2 bg-[#fff8f6] font-bold text-sm disabled:opacity-50">{rotulo}</button>)}
                    </div>
                  </> : <p className="font-bold text-sm text-emerald-800">{c.status === 'nao_respondeu' && c.tentativas < 2 ? 'Não respondeu · volta em 3 dias' : ROTULOS_RESULTADO[c.status] || 'Concluído'}{c.lead_id ? ' · lead criado' : ''}</p>}
                </div>;
              })}
            </div>
          </div>
        ))}
      </section>

      {/* grupos: botões grandes para o dedo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
        {GRUPOS.map(g => {
          const n = dados?.[g.id]?.length ?? 0;
          const ativo = grupo === g.id;
          return (
            <button key={g.id} onClick={() => { setGrupo(g.id); setEditando(false); }}
              className={`text-left p-3 sm:p-4 border-4 border-black min-h-[72px] ${ativo ? 'bg-[#ff6b00] text-white shadow-none translate-y-0.5' : 'bg-[#fff8f6] text-[#1a0f0a] shadow-[4px_4px_0_#000]'}`}>
              <span className="block font-black uppercase text-sm sm:text-base leading-tight">{g.titulo}</span>
              <span className="block font-black text-2xl">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-[#fff8f6] border-4 border-black p-3 sm:p-4 mb-4 space-y-3">
        <p className="text-sm font-bold text-[#6b5448]">{info.descricao}. Contatados hoje: <b className="text-[#1a0f0a]">{contatadosHoje}</b></p>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 flex-1 min-w-[200px] bg-white border-2 border-black px-3">
            <Search className="w-5 h-5 text-[#6b5448]" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome" className="flex-1 py-3 text-base outline-none bg-transparent" />
          </label>
          <button onClick={() => setEsconderHoje(!esconderHoje)} className={`px-4 py-3 border-2 border-black font-black uppercase text-xs ${esconderHoje ? 'bg-black text-white' : 'bg-white'}`}>
            {esconderHoje ? 'Escondendo contatados hoje' : 'Mostrando todos'}
          </button>
          <button onClick={() => setEditando(!editando)} className="flex items-center gap-1 px-4 py-3 border-2 border-black bg-white font-black uppercase text-xs"><Pencil className="w-4 h-4" /> Mensagem</button>
          <button onClick={copiarTelefones} className="flex items-center gap-1 px-4 py-3 border-2 border-black bg-white font-black uppercase text-xs"><Copy className="w-4 h-4" /> Copiar telefones</button>
          <button onClick={baixarCsv} className="flex items-center gap-1 px-4 py-3 border-2 border-black bg-white font-black uppercase text-xs"><Download className="w-4 h-4" /> Baixar lista</button>
        </div>
        {editando && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-[#6b5448]">Use {'{nome}'} e {'{instrumento}'}: o sistema troca pelos dados de cada pessoa. Fica salvo neste aparelho.</p>
            <textarea value={mensagens[grupo]} onChange={e => salvarMensagem(e.target.value)} rows={3} className="w-full border-2 border-black p-3 text-base bg-white" />
            <button onClick={() => salvarMensagem(MENSAGENS_PADRAO[grupo])} className="flex items-center gap-1 text-xs font-black uppercase text-[#ff6b00]"><RotateCcw className="w-3 h-3" /> Voltar para a mensagem padrão</button>
          </div>
        )}
      </div>

      {!dados ? (
        <p className="text-white font-black uppercase text-center py-10">Carregando...</p>
      ) : lista.length === 0 ? (
        <div className="bg-[#fff8f6] border-4 border-dashed border-[#8e7164] p-10 text-center">
          <p className="font-black uppercase text-lg">{esconderHoje && contatadosHoje > 0 ? 'Todo mundo deste grupo já foi contatado hoje 💪' : 'Ninguém neste grupo'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lista.map(p => {
            const link = `https://wa.me/${p.whatsapp}?text=${encodeURIComponent(textoPara(p))}`;
            return (
              <div key={`${p.tipo}-${p.id}`} className="bg-[#fff8f6] border-4 border-black shadow-[4px_4px_0_#000] p-3 sm:p-4 flex flex-col gap-3">
                <div>
                  <p className="font-black uppercase text-lg leading-tight break-words">{p.nome}</p>
                  <p className="text-sm font-bold text-[#6b5448]">
                    {p.instrumento || 'Instrumento não informado'}{p.dias_parado != null ? ` · parado há ${p.dias_parado} dia(s)` : ''}
                  </p>
                  <p className={`text-xs font-black uppercase mt-1 ${ehHoje(p.ultimo_contato) ? 'text-emerald-700' : 'text-[#8e7164]'}`}>
                    {quando(p.ultimo_contato)}{p.contatos > 1 ? ` · ${p.contatos} contatos` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a href={link} target="_blank" rel="noopener noreferrer" onClick={() => registrar(p)}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-[#0b3d1f] border-4 border-black font-black uppercase text-base min-h-[60px] shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none">
                    <MessageCircle className="w-6 h-6" /> WhatsApp
                  </a>
                  <button onClick={() => registrar(p)} title="Marcar como contatado sem abrir o WhatsApp"
                    className="w-[60px] min-h-[60px] flex items-center justify-center bg-white border-4 border-black shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none">
                    <Check className="w-6 h-6" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
