import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Check, Copy, Download, Pencil, RotateCcw, Search, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../services/apiClient';

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
  const [dados, setDados] = useState<Record<Grupo, any[]> | null>(null);
  const [grupo, setGrupo] = useState<Grupo>('aula_marcada');
  const [busca, setBusca] = useState('');
  const [esconderHoje, setEsconderHoje] = useState(true);
  const [mensagens, setMensagens] = useState<Record<Grupo, string>>(lerMensagens);
  const [editando, setEditando] = useState(false);

  const carregar = () => apiFetch('/api/remarketing').then(r => (r.ok ? r.json() : null)).then(d => d && setDados(d)).catch(() => toast.error('Não foi possível carregar a lista.'));
  useEffect(() => { carregar(); }, []);

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
