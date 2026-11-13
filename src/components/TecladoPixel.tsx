import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

type Props = { esperado?: number | null; proximas?: number[]; dedo?: number; midiOuvido?: number | null; midiCorreto?: boolean; efeito?: { tipo: 'acerto' | 'erro'; id: number } | null; };
const PRETAS = new Set([1, 3, 6, 8, 10]);
const NOME = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si'];
const INICIO = 36;
const FIM = 108;
export default function TecladoPixel({ esperado, proximas = [], dedo, midiOuvido, midiCorreto, efeito }: Props) {
  const faixa = useRef<HTMLDivElement>(null);
  const quadro = useRef<HTMLDivElement>(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const [simulada, setSimulada] = useState(false);
  const brancas = Array.from({ length: FIM - INICIO + 1 }, (_, i) => INICIO + i).filter(m => !PRETAS.has(m % 12));
  useEffect(() => {
    const alvo = esperado ?? midiOuvido;
    if (alvo == null || !faixa.current) return;
    const indice = brancas.filter(m => m < alvo).length;
    faixa.current.scrollTo({ left: Math.max(0, indice * 47 - faixa.current.clientWidth / 2), behavior: 'smooth' });
  }, [esperado, midiOuvido]);
  useEffect(() => {
    const mudou = () => setTelaCheia(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', mudou);
    return () => document.removeEventListener('fullscreenchange', mudou);
  }, []);
  const alternarTela = async () => {
    if (simulada) { setSimulada(false); return; }
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    if (quadro.current?.requestFullscreen) {
      try { await quadro.current.requestFullscreen(); return; } catch { /* fallback para Safari iOS */ }
    }
    setSimulada(true);
  };
  const classeMarca = (midi: number) => midiOuvido === midi ? (midiCorreto ? 'bg-emerald-400 text-black' : 'bg-rose-500 text-white') : esperado === midi ? 'bg-[#ff6b00] text-white' : '';
  return <div ref={quadro} className={`relative overflow-hidden border-4 border-black bg-[#1a0f0a] text-white shadow-[6px_6px_0_#000] ${simulada ? 'fixed inset-0 z-[100] flex flex-col' : ''} ${telaCheia ? 'h-dvh w-screen flex flex-col' : ''} w-full md:landscape:min-h-[220px]`}>
    <style>{`@keyframes teclado-particula { 0% { opacity:1; transform:translate(0,0) scale(1) } 100% { opacity:0; transform:translate(var(--dx),var(--dy)) scale(.2) } } .teclado-particula { animation:teclado-particula .65s ease-out both } @media (orientation:landscape) { :fullscreen .teclado-faixa > div { height:calc(100dvh - 72px) } } @media (prefers-reduced-motion:reduce) { .teclado-particula { display:none } .teclado-faixa { scroll-behavior:auto !important } }`}</style>
    <div className="flex items-center justify-between gap-2 p-3 border-b-4 border-black bg-[#261812]"><div><p className="text-xs tracking-[.3em] text-[#ffcc22] font-black">TECLADO</p><p className="font-black text-lg">{esperado == null ? 'Escute e toque' : `${NOME[esperado % 12]}${Math.floor(esperado / 12) - 1}`} <span className="text-[#ffcc22]">{dedo ? `· dedo ${dedo}` : ''}</span></p></div><button type="button" onClick={alternarTela} className="shrink-0 min-h-11 border-2 border-white px-2 py-1 text-xs font-black bg-[#ff6b00] text-black">{telaCheia || simulada ? 'Sair da tela cheia' : 'Tela cheia'}</button></div>
    {(simulada || telaCheia) && <p className="text-center text-xs font-bold py-1 bg-[#111b35] landscape:hidden">No celular, gire para a horizontal ↻</p>}
    <div ref={faixa} className="teclado-faixa w-full overflow-x-auto overscroll-x-contain p-3 pb-5 flex-1 flex items-center md:landscape:py-2" aria-label="Teclado de Dó2 a Dó7"><div className="relative flex h-52 min-w-max md:landscape:h-[min(26vh,250px)] border-4 border-black bg-black p-1 shadow-[inset_0_8px_0_#4a3529]" style={{ imageRendering: 'pixelated' }}>
      {brancas.map(m => {
        const ativo = esperado === m || midiOuvido === m;
        return <div key={m} className={`relative w-[47px] h-full border-x-2 border-b-[7px] border-black rounded-b-sm bg-gradient-to-b ${esperado === m ? 'from-[#ff8a33] via-[#ff6b00] to-[#c84a00]' : 'from-[#fffdf6] via-[#f1e9d8] to-[#d9cdb6]'} shadow-[inset_3px_0_0_#fff,inset_-3px_0_0_#a39580]`}>
          {proximas.includes(m) && !ativo && <span className="absolute bottom-9 left-1/2 -translate-x-1/2 w-7 h-8 border-[3px] border-dashed border-[#ffcc22]" />}
          {ativo && <span className={`absolute bottom-8 left-1/2 -translate-x-1/2 min-w-8 h-8 grid place-items-center border-2 border-black font-black shadow-[2px_2px_0_#000] ${classeMarca(m)}`}>{esperado === m ? dedo || '●' : '♪'}</span>}
          {m % 12 === 0 && <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-black ${esperado === m ? 'text-white' : 'text-[#6b5448]'}`}>Dó{Math.floor(m / 12) - 1}{m === 60 ? ' ●' : ''}</span>}
        </div>;
      })}
      {Array.from({ length: FIM - INICIO + 1 }, (_, i) => INICIO + i).filter(m => PRETAS.has(m % 12)).map(m => {
        const antes = brancas.filter(b => b < m).length;
        const ativo = esperado === m || midiOuvido === m;
        return <div key={m} className={`absolute top-1 z-10 w-[27px] h-[62%] border-[3px] border-black rounded-b-sm bg-gradient-to-r ${esperado === m ? 'from-[#ff8a33] via-[#ff6b00] to-[#ad3d00]' : 'from-[#3a3a3a] via-[#0d0d0d] to-black'} shadow-[3px_5px_0_#000,inset_2px_2px_0_#777]`} style={{ left: 4 + antes * 47 - 13.5 }}>
          {proximas.includes(m) && !ativo && <span className="absolute bottom-5 left-1 w-4 h-7 border-[3px] border-dashed border-[#ffcc22]" />}
          {ativo && <span className={`absolute bottom-4 left-1/2 -translate-x-1/2 min-w-7 h-7 grid place-items-center border-2 border-black font-black shadow-[2px_2px_0_#000] ${classeMarca(m)}`}>{esperado === m ? dedo || '●' : '♪'}</span>}
        </div>;
      })}
    </div></div>
    {efeito?.tipo === 'acerto' && <div key={efeito.id} className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} className="teclado-particula absolute left-1/2 top-1/2 w-3 h-3 bg-amber-300 border border-black" style={{ '--dx': `${Math.cos(i * 2.4) * (50 + i * 8)}px`, '--dy': `${Math.sin(i * 2.4) * (40 + i * 8)}px` } as CSSProperties} />)}</div>}
    {efeito?.tipo === 'erro' && <div key={efeito.id} className="pointer-events-none absolute inset-0 border-4 border-rose-500" />}
  </div>;
}
