import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

type Props = { esperado?: number | null; proximas?: number[]; dedo?: number; midiOuvido?: number | null; midiCorreto?: boolean; efeito?: { tipo: 'acerto' | 'erro'; id: number } | null; };
const PRETAS = new Set([1, 3, 6, 8, 10]);
const NOME = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si'];
const INICIO = 36;
const FIM = 108;
// Tecla preta: quanto da largura dela fica à esquerda da divisa entre as brancas (posição real no piano).
const DESLOCAMENTO: Record<number, number> = { 1: .62, 3: .38, 6: .6, 8: .5, 10: .4 };
const nomeMidi = (m: number) => `${NOME[m % 12]}${Math.floor(m / 12) - 1}`;

export default function TecladoPixel({ esperado, proximas = [], dedo, midiOuvido, midiCorreto, efeito }: Props) {
  const faixa = useRef<HTMLDivElement>(null);
  const quadro = useRef<HTMLDivElement>(null);
  const primeiraVez = useRef(true);
  const [cheia, setCheia] = useState(false);
  const [alturaTela, setAlturaTela] = useState(() => (typeof window === 'undefined' ? 700 : window.innerHeight));
  const brancas = Array.from({ length: FIM - INICIO + 1 }, (_, i) => INICIO + i).filter(m => !PRETAS.has(m % 12));

  useEffect(() => {
    const medir = () => setAlturaTela(window.innerHeight);
    window.addEventListener('resize', medir);
    window.addEventListener('orientationchange', medir);
    return () => { window.removeEventListener('resize', medir); window.removeEventListener('orientationchange', medir); };
  }, []);

  // Proporção de piano de verdade: a branca tem ~1/5,5 da altura; em tela cheia ela cresce com a tela.
  const alturaTeclas = cheia ? Math.max(150, alturaTela - 92) : Math.round(Math.min(200, Math.max(120, alturaTela * .42)));
  const largura = Math.round(Math.max(30, Math.min(cheia ? 76 : 44, alturaTeclas / (cheia ? 5.2 : 4.5))));
  const larguraPreta = Math.round(largura * .58);

  useEffect(() => {
    const alvo = esperado ?? midiOuvido;
    if (alvo == null || !faixa.current) return;
    const indice = brancas.filter(m => m < alvo).length;
    const el = faixa.current;
    const rolar = () => el.scrollTo({ left: Math.max(0, indice * largura - el.clientWidth / 2), behavior: primeiraVez.current ? 'auto' : 'smooth' });
    // na primeira vez espera o layout assentar (senão fica parado no começo do teclado)
    if (primeiraVez.current) { requestAnimationFrame(() => { rolar(); primeiraVez.current = false; }); } else rolar();
  }, [esperado, midiOuvido, largura]);

  useEffect(() => {
    const saiu = () => { if (!document.fullscreenElement) setCheia(false); };
    document.addEventListener('fullscreenchange', saiu);
    return () => document.removeEventListener('fullscreenchange', saiu);
  }, []);

  const alternarTela = async () => {
    if (cheia) {
      setCheia(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      return;
    }
    setCheia(true); // ocupa a tela toda mesmo no iPhone (sem tela cheia de verdade no Safari)
    try { await document.documentElement.requestFullscreen?.(); } catch { /* sem suporte */ }
    try { await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'); } catch { /* sem suporte */ }
  };

  const classeMarca = (midi: number) => midiOuvido === midi ? (midiCorreto ? 'bg-emerald-400 text-black' : 'bg-rose-500 text-white') : esperado === midi ? 'bg-[#ff6b00] text-white' : '';
  const proximasNomes = proximas.slice(0, 4).map(nomeMidi);

  return <div ref={quadro} className={`overflow-hidden border-4 border-black bg-[#1a0f0a] text-white ${cheia ? 'fixed inset-0 z-[200] flex flex-col border-0' : 'relative w-full shadow-[6px_6px_0_#000]'}`}>
    <style>{`@keyframes teclado-particula { 0% { opacity:1; transform:translate(0,0) scale(1) } 100% { opacity:0; transform:translate(var(--dx),var(--dy)) scale(.2) } } .teclado-particula { animation:teclado-particula .65s ease-out both } @media (prefers-reduced-motion:reduce) { .teclado-particula { display:none } .teclado-faixa { scroll-behavior:auto !important } }`}</style>
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b-4 border-black bg-[#261812]">
      <div className="min-w-0 flex items-center gap-3">
        <div>
          <p className="text-[10px] tracking-[.3em] text-[#ffcc22] font-black">{cheia ? 'TOQUE AGORA' : 'TECLADO'}</p>
          <p className={`font-black leading-tight ${cheia ? 'text-2xl' : 'text-lg'}`}>{esperado == null ? 'Escute e toque' : nomeMidi(esperado)} <span className="text-[#ffcc22]">{dedo ? `· dedo ${dedo}` : ''}</span></p>
        </div>
        {cheia && proximasNomes.length > 0 && <div className="hidden sm:flex items-center gap-1"><span className="text-[10px] font-black text-[#c9b3a8]">DEPOIS ▶</span>{proximasNomes.map((n, i) => <span key={i} className="border-2 border-black bg-[#fff8f6] text-black px-1.5 py-0.5 text-xs font-black">{n}</span>)}</div>}
      </div>
      <button type="button" onClick={alternarTela} className="shrink-0 min-h-11 border-2 border-white px-3 py-1 text-xs font-black bg-[#ff6b00] text-black">{cheia ? '✕ Sair' : '⛶ Tela cheia'}</button>
    </div>
    {cheia && <p className="text-center text-xs font-bold py-1 bg-[#111b35] landscape:hidden">Gire o celular para a horizontal ↻</p>}
    <div ref={faixa} className="teclado-faixa w-full overflow-x-auto overscroll-x-contain p-2 flex-1 flex items-center" aria-label="Teclado de Dó2 a Dó7">
      <div className="relative flex min-w-max border-4 border-black bg-black p-1 shadow-[inset_0_8px_0_#4a3529]" style={{ height: alturaTeclas }}>
        {brancas.map(m => {
          const ativo = esperado === m || midiOuvido === m;
          return <div key={m} style={{ width: largura }} className={`relative h-full border-x-2 border-b-[7px] border-black rounded-b-sm bg-gradient-to-b ${esperado === m ? 'from-[#ff8a33] via-[#ff6b00] to-[#c84a00]' : 'from-[#fffdf6] via-[#f1e9d8] to-[#d9cdb6]'} shadow-[inset_3px_0_0_#fff,inset_-3px_0_0_#a39580]`}>
            {proximas.includes(m) && !ativo && <span className="absolute bottom-9 left-1/2 -translate-x-1/2 w-[60%] h-8 border-[3px] border-dashed border-[#ffcc22]" />}
            {ativo && <span className={`absolute bottom-8 left-1/2 -translate-x-1/2 min-w-8 h-8 grid place-items-center border-2 border-black font-black shadow-[2px_2px_0_#000] ${classeMarca(m)}`}>{esperado === m ? dedo || '●' : '♪'}</span>}
            {m % 12 === 0 && <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-black whitespace-nowrap ${esperado === m ? 'text-white' : 'text-[#6b5448]'}`}>Dó{Math.floor(m / 12) - 1}{m === 60 ? ' ●' : ''}</span>}
          </div>;
        })}
        {Array.from({ length: FIM - INICIO + 1 }, (_, i) => INICIO + i).filter(m => PRETAS.has(m % 12)).map(m => {
          const antes = brancas.filter(b => b < m).length;
          const ativo = esperado === m || midiOuvido === m;
          return <div key={m} style={{ left: 4 + antes * largura - larguraPreta * DESLOCAMENTO[m % 12], width: larguraPreta }}
            className={`absolute top-1 z-10 h-[62%] border-[3px] border-black rounded-b-sm bg-gradient-to-r ${esperado === m ? 'from-[#ff8a33] via-[#ff6b00] to-[#ad3d00]' : 'from-[#3a3a3a] via-[#0d0d0d] to-black'} shadow-[3px_5px_0_#000,inset_2px_2px_0_#777]`}>
            {proximas.includes(m) && !ativo && <span className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[60%] h-7 border-[3px] border-dashed border-[#ffcc22]" />}
            {ativo && <span className={`absolute bottom-4 left-1/2 -translate-x-1/2 min-w-7 h-7 grid place-items-center border-2 border-black font-black shadow-[2px_2px_0_#000] ${classeMarca(m)}`}>{esperado === m ? dedo || '●' : '♪'}</span>}
          </div>;
        })}
      </div>
    </div>
    {efeito?.tipo === 'acerto' && <div key={efeito.id} className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} className="teclado-particula absolute left-1/2 top-1/2 w-3 h-3 bg-amber-300 border border-black" style={{ '--dx': `${Math.cos(i * 2.4) * (50 + i * 8)}px`, '--dy': `${Math.sin(i * 2.4) * (40 + i * 8)}px` } as CSSProperties} />)}</div>}
    {efeito?.tipo === 'erro' && <div key={efeito.id} className="pointer-events-none absolute inset-0 border-4 border-rose-500" />}
  </div>;
}
