import React, { useEffect, useRef, useState } from 'react';
import { Bot, X, Send, Check, Ban, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../services/apiClient';

interface Mensagem { role: 'user' | 'model'; texto: string; }
interface Acao { tipo: string; descricao: string; token: string; estado?: 'pendente' | 'feito' | 'cancelado' | 'erro'; erro?: string; }

const SUGESTOES = [
  'Quem está com mensalidade atrasada?',
  'Dar baixa na mensalidade deste mês da ...',
  'Remarcar a próxima aula da ... para sexta às 18h',
  'Mudar o horário fixo da ... para terça 17h'
];

export function AssistenteIA() {
  const [aberto, setAberto] = useState(false);
  const [configurado, setConfigurado] = useState<boolean | null>(null);
  const [chave, setChave] = useState('');
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [acoes, setAcoes] = useState<Record<number, Acao[]>>({});
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aberto && configurado === null) {
      apiFetch('/api/assistente/status').then((r) => (r.ok ? r.json() : null)).then((d) => setConfigurado(Boolean(d?.configurado))).catch(() => setConfigurado(false));
    }
  }, [aberto]);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens, acoes, enviando]);

  const salvarChave = async () => {
    const res = await apiFetch('/api/assistente/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: chave }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(d.error || 'Chave inválida');
    toast.success('Assistente ativado!');
    setChave('');
    setConfigurado(true);
  };

  const enviar = async (conteudo?: string) => {
    const msg = (conteudo ?? texto).trim();
    if (!msg || enviando) return;
    const novas = [...mensagens, { role: 'user' as const, texto: msg }];
    setMensagens(novas);
    setTexto('');
    setEnviando(true);
    try {
      const res = await apiFetch('/api/assistente/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagens: novas }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Erro no assistente');
      const idx = novas.length;
      setMensagens([...novas, { role: 'model', texto: d.resposta }]);
      if (Array.isArray(d.acoes) && d.acoes.length) setAcoes((prev) => ({ ...prev, [idx]: d.acoes.map((a: Acao) => ({ ...a, estado: 'pendente' })) }));
    } catch (e: any) {
      setMensagens([...novas, { role: 'model', texto: `⚠️ ${e.message}` }]);
    } finally {
      setEnviando(false);
    }
  };

  const atualizarAcao = (idx: number, i: number, patch: Partial<Acao>) =>
    setAcoes((prev) => ({ ...prev, [idx]: prev[idx].map((a, j) => (j === i ? { ...a, ...patch } : a)) }));

  const confirmar = async (idx: number, i: number) => {
    const acao = acoes[idx][i];
    try {
      const res = await apiFetch('/api/assistente/executar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: acao.token }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Falha ao executar');
      atualizarAcao(idx, i, { estado: 'feito' });
      toast.success('Feito!');
    } catch (e: any) {
      atualizarAcao(idx, i, { estado: 'erro', erro: e.message });
      toast.error(e.message);
    }
  };

  return (
    <>
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="fixed bottom-5 right-5 z-[90] flex items-center gap-2 bg-[#ff6b00] text-white px-4 py-3 border-4 border-black shadow-[4px_4px_0_#000] font-black text-xs uppercase hover:translate-y-0.5 transition-transform"
          title="Assistente de IA"
        >
          <Bot className="w-5 h-5" /> Assistente
        </button>
      )}

      {aberto && (
        <div className="fixed bottom-4 right-4 left-4 md:left-auto z-[95] md:w-[400px] h-[70vh] max-h-[620px] flex flex-col bg-[#fff8f6] border-4 border-black shadow-[8px_8px_0_#000] font-['Space_Mono']">
          <div className="flex items-center justify-between px-4 py-3 bg-[#261812] border-b-4 border-black">
            <div className="flex items-center gap-2 text-white">
              <Bot className="w-5 h-5 text-[#ff6b00]" />
              <span className="font-black text-xs uppercase tracking-widest">Assistente Acorde</span>
            </div>
            <button onClick={() => setAberto(false)} className="text-white" title="Fechar"><X className="w-5 h-5" /></button>
          </div>

          {configurado === false ? (
            <div className="p-4 space-y-3 overflow-y-auto">
              <p className="font-black text-xs uppercase">Ativar assistente (gratuito)</p>
              <ol className="list-decimal pl-5 text-[10px] font-bold space-y-1">
                <li>Entre em <b>aistudio.google.com/apikey</b> com a conta Google da escola.</li>
                <li>Clique em <b>Create API key</b> e copie a chave (começa com AIza).</li>
                <li>Cole abaixo e salve.</li>
              </ol>
              <p className="text-[9px] font-bold text-[#8e7164]">Na camada gratuita o Google pode usar as conversas para melhorar os modelos. O assistente só envia nomes, datas e valores (nunca CPF ou endereço).</p>
              <input value={chave} onChange={(e) => setChave(e.target.value)} type="password" placeholder="AIza..." className="w-full border-2 border-black p-2 text-xs font-bold" />
              <button onClick={salvarChave} disabled={!chave} className="w-full bg-black text-white py-2 font-black text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-40">
                <KeyRound className="w-4 h-4" /> Salvar chave
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {mensagens.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-[#8e7164]">Peça em português. Toda alteração aparece para você confirmar antes.</p>
                    {SUGESTOES.map((s) => (
                      <button key={s} onClick={() => setTexto(s)} className="block w-full text-left bg-white border-2 border-black p-2 text-[10px] font-bold hover:bg-[#ffeae1]">{s}</button>
                    ))}
                  </div>
                )}
                {mensagens.map((m, idx) => (
                  <div key={idx}>
                    <div className={`max-w-[90%] p-2 border-2 border-black text-xs whitespace-pre-line ${m.role === 'user' ? 'ml-auto bg-[#ff6b00] text-white' : 'bg-white text-black'}`}>{m.texto}</div>
                    {m.role === 'model' && (acoes[idx] || []).map((a, i) => (
                      <div key={a.token} className="mt-2 border-4 border-black bg-yellow-50 p-2">
                        <p className="text-[10px] font-black uppercase mb-1">Confirmar ação?</p>
                        <p className="text-xs font-bold">{a.descricao}</p>
                        {a.estado === 'pendente' && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => confirmar(idx, i)} className="flex-1 bg-emerald-600 text-white py-1.5 font-black text-[10px] uppercase border-2 border-black flex items-center justify-center gap-1"><Check className="w-3 h-3" /> Confirmar</button>
                            <button onClick={() => atualizarAcao(idx, i, { estado: 'cancelado' })} className="flex-1 bg-white py-1.5 font-black text-[10px] uppercase border-2 border-black flex items-center justify-center gap-1"><Ban className="w-3 h-3" /> Cancelar</button>
                          </div>
                        )}
                        {a.estado === 'feito' && <p className="text-[10px] font-black text-emerald-700 mt-1">✅ Feito</p>}
                        {a.estado === 'cancelado' && <p className="text-[10px] font-black text-[#8e7164] mt-1">Cancelado</p>}
                        {a.estado === 'erro' && <p className="text-[10px] font-black text-red-700 mt-1">Erro: {a.erro}</p>}
                      </div>
                    ))}
                  </div>
                ))}
                {enviando && <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[#8e7164]"><Loader2 className="w-4 h-4 animate-spin" /> Pensando...</div>}
                <div ref={fimRef} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="flex gap-2 p-3 border-t-4 border-black">
                <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: dar baixa na mensalidade da Ana" className="flex-1 border-2 border-black p-2 text-xs font-bold outline-none focus:bg-[#ffeae1]" />
                <button type="submit" disabled={enviando || !texto.trim()} className="bg-[#ff6b00] text-white px-3 border-2 border-black disabled:opacity-40" title="Enviar"><Send className="w-4 h-4" /></button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
