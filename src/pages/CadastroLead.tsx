import React, { useEffect, useMemo, useState } from 'react';
import { Check, Music } from 'lucide-react';

// Página pública: o lead preenche em poucos segundos e cai direto no Atendimento.
// Links úteis: /cadastro  ·  /cadastro?origem=instagram  ·  ?origem=google  ·  ?origem=anuncio  ·  ?origem=indicacao

const ORIGENS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'google', label: 'Google' },
  { id: 'indicacao', label: 'Indicação' },
  { id: 'outros', label: 'Outros' }
];

const mascaraTelefone = (v: string) => {
  const d = v.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export default function CadastroLead() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const origemUrl = (params.get('origem') || '').toLowerCase();
  const veioDeAnuncio = origemUrl === 'anuncio' || origemUrl === 'trafego_pago';

  const [cursos, setCursos] = useState<any[]>([]);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [curso, setCurso] = useState<string>('');
  const [origem, setOrigem] = useState<string>(veioDeAnuncio ? 'trafego_pago' : (ORIGENS.some(o => o.id === origemUrl) ? origemUrl : ''));
  const [indicadoPor, setIndicadoPor] = useState('');
  const [website, setWebsite] = useState(''); // campo invisível contra robôs
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    document.title = 'Cadastro · Studio Acorde';
    fetch('/api/publico/cursos').then(r => (r.ok ? r.json() : [])).then(d => setCursos(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (nome.trim().length < 2) return setErro('Digite seu nome.');
    if (telefone.replace(/\D/g, '').length < 10) return setErro('Digite seu WhatsApp com DDD.');
    if (!origem) return setErro('Conte como você conheceu a escola.');
    setEnviando(true);
    try {
      const res = await fetch('/api/publico/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, telefone, interesse_curso_id: curso && curso !== 'nao_sei' ? Number(curso) : null, origem, indicado_por: indicadoPor, website })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não foi possível enviar agora.');
      setEnviado(true);
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível enviar agora.');
    } finally {
      setEnviando(false);
    }
  };

  const chip = (ativo: boolean) =>
    `px-4 py-3 border-2 border-black font-bold text-base text-left transition-colors ${ativo ? 'bg-[#ff6b00] text-white' : 'bg-white text-[#1a0f0a] hover:bg-[#ffeae1]'}`;

  if (enviado) {
    return (
      <div className="min-h-screen bg-[#fff8f6] flex items-center justify-center p-4">
        <div className="bg-white border-4 border-black shadow-[6px_6px_0_#000] p-6 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#00c853] border-4 border-black rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-[#1a0f0a] mb-2">Pronto, {nome.trim().split(' ')[0]}!</h1>
          <p className="text-base text-[#3d2d26]">Recebemos seus dados. Pode voltar para a conversa no WhatsApp que a gente continua por lá. 🎶</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff8f6] flex justify-center p-4 py-8">
      <form onSubmit={enviar} className="bg-white border-4 border-black shadow-[6px_6px_0_#000] p-5 sm:p-6 max-w-md w-full space-y-5 h-fit" noValidate>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#ff6b00] border-2 border-black flex items-center justify-center shrink-0">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#ff6b00]">Studio Acorde · Escola de Música</p>
            <h1 className="text-xl font-black text-[#1a0f0a] leading-tight">Falta pouco! Leva 30 segundos.</h1>
          </div>
        </div>

        <label className="block">
          <span className="block text-sm font-black text-[#1a0f0a] mb-1">Seu nome</span>
          <input value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" placeholder="Nome e sobrenome"
            className="w-full border-2 border-black px-3 py-3 text-base text-[#1a0f0a] bg-white outline-none focus:border-[#ff6b00]" />
        </label>

        <label className="block">
          <span className="block text-sm font-black text-[#1a0f0a] mb-1">WhatsApp com DDD</span>
          <input value={telefone} onChange={e => setTelefone(mascaraTelefone(e.target.value))} inputMode="tel" autoComplete="tel" placeholder="(65) 99999-9999"
            className="w-full border-2 border-black px-3 py-3 text-base text-[#1a0f0a] bg-white outline-none focus:border-[#ff6b00]" />
        </label>

        <fieldset>
          <legend className="text-sm font-black text-[#1a0f0a] mb-2">Qual instrumento te interessa?</legend>
          <div className="grid grid-cols-2 gap-2">
            {cursos.map(c => (
              <button key={c.id} type="button" onClick={() => setCurso(String(c.id))} className={chip(curso === String(c.id))} aria-pressed={curso === String(c.id)}>{c.nome}</button>
            ))}
            <button type="button" onClick={() => setCurso('nao_sei')} className={chip(curso === 'nao_sei')} aria-pressed={curso === 'nao_sei'}>Ainda não sei</button>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-black text-[#1a0f0a] mb-2">Como conheceu a escola?</legend>
          <div className="grid grid-cols-2 gap-2">
            {veioDeAnuncio && (
              <button type="button" onClick={() => setOrigem('trafego_pago')} className={chip(origem === 'trafego_pago')} aria-pressed={origem === 'trafego_pago'}>Anúncio</button>
            )}
            {ORIGENS.map(o => (
              <button key={o.id} type="button" onClick={() => setOrigem(o.id)} className={chip(origem === o.id)} aria-pressed={origem === o.id}>{o.label}</button>
            ))}
          </div>
        </fieldset>

        {origem === 'indicacao' && (
          <label className="block">
            <span className="block text-sm font-black text-[#1a0f0a] mb-1">Quem indicou? (opcional)</span>
            <input value={indicadoPor} onChange={e => setIndicadoPor(e.target.value)} placeholder="Nome de quem indicou"
              className="w-full border-2 border-black px-3 py-3 text-base text-[#1a0f0a] bg-white outline-none focus:border-[#ff6b00]" />
          </label>
        )}

        {/* invisível para pessoas; robôs costumam preencher */}
        <input value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true"
          className="absolute -left-[9999px] w-px h-px opacity-0" name="website" />

        {erro && <p className="text-sm font-bold text-red-700 bg-red-50 border-2 border-red-700 px-3 py-2" role="alert">{erro}</p>}

        <button type="submit" disabled={enviando}
          className="w-full bg-[#ff6b00] text-white border-4 border-black py-4 text-lg font-black uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none disabled:opacity-60">
          {enviando ? 'Enviando...' : 'Enviar'}
        </button>
        <p className="text-xs text-[#6b5448] text-center">Usamos seus dados só para falar com você sobre as aulas.</p>
      </form>
    </div>
  );
}
