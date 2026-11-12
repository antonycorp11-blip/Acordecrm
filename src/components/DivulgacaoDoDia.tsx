import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Flame, Megaphone, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../services/apiClient';

// Checklist diário de postagens (Instagram do Studio, Instagram pessoal, status e grupos do WhatsApp).
// Fica salvo no banco: marcar no tablet aparece marcado no celular também.

type Canal = { id: string; titulo: string; dica: string; feito_em: string | null };
type Dados = { hoje: string; sequencia: number; total: number; semana: { dia: string; feitos: number }[]; canais: Canal[] };

const LINKS: Record<string, string> = {
  insta_studio: 'https://www.instagram.com/',
  insta_pessoal: 'https://www.instagram.com/'
};
const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function DivulgacaoDoDia({ compacto = false }: { compacto?: boolean }) {
  const navigate = useNavigate();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState(false);
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = () => apiFetch('/api/divulgacao/hoje')
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(d => { setDados(d); setErro(false); })
    .catch(() => setErro(true));
  useEffect(() => { carregar(); }, []);

  const alternar = async (c: Canal) => {
    if (!dados) return;
    const feito = !c.feito_em;
    setSalvando(c.id);
    // atualiza na hora; se falhar, volta
    const anterior = dados;
    setDados({ ...dados, canais: dados.canais.map(x => (x.id === c.id ? { ...x, feito_em: feito ? new Date().toISOString() : null } : x)) });
    try {
      const r = await apiFetch(`/api/divulgacao/${c.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feito }) });
      if (!r.ok) throw new Error();
      const feitosAgora = anterior.canais.filter(x => x.feito_em).length + (feito ? 1 : -1);
      if (feito && feitosAgora === anterior.total) toast.success('🔥 Divulgação do dia completa!');
      carregar();
    } catch {
      setDados(anterior);
      toast.error('Não consegui salvar. Tente de novo.');
    } finally { setSalvando(null); }
  };

  if (erro) return null;
  if (!dados) return <div className="bg-[#fff8f6] border-4 border-black p-4 font-black uppercase text-sm text-[#1a0f0a]">Carregando divulgação...</div>;

  const feitos = dados.canais.filter(c => c.feito_em).length;
  const completo = feitos === dados.total;

  // versão do Dashboard: resumo com atalho
  if (compacto) {
    return (
      <button onClick={() => navigate('/remarketing')}
        className={`w-full text-left border-4 border-black p-4 flex items-center gap-4 shadow-[4px_4px_0_#000] ${completo ? 'bg-[#eaf9ef]' : 'bg-[#fff3c4]'}`}>
        <Megaphone className="w-8 h-8 shrink-0 text-[#1a0f0a]" />
        <div className="flex-1 min-w-0 text-[#1a0f0a]">
          <p className="font-black uppercase text-sm">Divulgação de hoje · {feitos}/{dados.total}</p>
          <p className="text-xs font-bold text-[#6b5448] truncate">
            {completo ? 'Tudo postado hoje 💪' : `Falta: ${dados.canais.filter(c => !c.feito_em).map(c => c.titulo).join(', ')}`}
          </p>
        </div>
        {dados.sequencia > 0 && <span className="flex items-center gap-1 font-black text-[#ff6b00]"><Flame className="w-5 h-5" />{dados.sequencia}</span>}
        <ChevronRight className="w-5 h-5 text-[#1a0f0a]" />
      </button>
    );
  }

  return (
    <div className="bg-[#fff8f6] border-4 border-black p-3 sm:p-4 space-y-3 text-[#1a0f0a]">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-black uppercase text-base flex items-center gap-2"><Megaphone className="w-5 h-5" /> Divulgação de hoje · {feitos}/{dados.total}</h2>
        <span className={`flex items-center gap-1 font-black text-sm ${dados.sequencia > 0 ? 'text-[#ff6b00]' : 'text-[#8e7164]'}`}>
          <Flame className="w-5 h-5" /> {dados.sequencia} {dados.sequencia === 1 ? 'dia seguido' : 'dias seguidos'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {dados.canais.map(c => {
          const feito = !!c.feito_em;
          return (
            <div key={c.id} className={`border-4 border-black flex items-stretch ${feito ? 'bg-[#eaf9ef]' : 'bg-white'}`}>
              <button onClick={() => alternar(c)} disabled={salvando === c.id} aria-pressed={feito}
                className="flex-1 flex items-center gap-3 p-3 text-left min-h-[60px]">
                <span className={`w-8 h-8 shrink-0 border-4 border-black flex items-center justify-center ${feito ? 'bg-[#1f9d55] text-white' : 'bg-white'}`}>
                  {feito && <Check className="w-5 h-5" strokeWidth={4} />}
                </span>
                <span className="min-w-0">
                  <span className={`block font-black uppercase text-sm leading-tight ${feito ? 'line-through decoration-2' : ''}`}>{c.titulo}</span>
                  <span className="block text-xs font-bold text-[#6b5448]">{feito ? `Postado às ${new Date(c.feito_em!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : c.dica}</span>
                </span>
              </button>
              {LINKS[c.id] && !feito && (
                <a href={LINKS[c.id]} target="_blank" rel="noopener noreferrer" className="flex items-center px-3 border-l-4 border-black font-black uppercase text-[11px] bg-[#ffeae1]">Abrir</a>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5" aria-label="Últimos 7 dias">
        {dados.semana.map(d => {
          const dt = new Date(`${d.dia}T12:00:00`);
          const cor = d.feitos >= dados.total ? 'bg-[#1f9d55] text-white' : d.feitos > 0 ? 'bg-[#ffd66b]' : 'bg-[#eadbd3]';
          return (
            <span key={d.dia} title={`${dt.toLocaleDateString('pt-BR')}: ${d.feitos}/${dados.total}`}
              className={`w-8 h-8 border-2 border-black flex items-center justify-center text-[11px] font-black ${cor} ${d.dia === dados.hoje ? 'outline outline-2 outline-[#ff6b00]' : ''}`}>
              {DIAS[dt.getDay()]}
            </span>
          );
        })}
        <span className="text-[11px] font-bold text-[#6b5448] ml-1">últimos 7 dias</span>
      </div>
    </div>
  );
}
