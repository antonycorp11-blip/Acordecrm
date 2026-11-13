import { useEffect, useRef } from 'react';

export type EstiloMetronomo = 'bolinha' | 'pendulo' | 'mascote';

const CHAVE_ESTILO = 'acorde_estilo_metronomo';
export function lerEstiloMetronomo(): EstiloMetronomo {
  try {
    const valor = localStorage.getItem(CHAVE_ESTILO);
    if (valor === 'bolinha' || valor === 'pendulo' || valor === 'mascote') return valor;
  } catch { /* Armazenamento indisponível. */ }
  return 'bolinha';
}
export function salvarEstiloMetronomo(valor: EstiloMetronomo) {
  try { localStorage.setItem(CHAVE_ESTILO, valor); } catch { /* A escolha ainda vale nesta tela. */ }
}

type Props = { bpm: number; ligado: boolean; inicioMs: number | null; estilo: EstiloMetronomo; compacto?: boolean; compasso?: number };

export default function Metronomo({ bpm, ligado, inicioMs, estilo, compacto = false, compasso = 4 }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const movel = useRef<HTMLDivElement>(null);
  const sombra = useRef<HTMLDivElement>(null);
  const cabeca = useRef<HTMLDivElement>(null);
  const pe = useRef<HTMLDivElement>(null);
  const luzes = useRef<(HTMLDivElement | null)[]>([]);
  const plataformas = useRef<(HTMLDivElement | null)[]>([]);
  const inicioLocal = useRef<number | null>(null);

  useEffect(() => {
    if (!ligado) {
      inicioLocal.current = null;
      luzes.current.forEach(luz => { if (luz) { luz.style.backgroundColor = '#3a2820'; luz.style.boxShadow = 'none'; } });
      plataformas.current.forEach(plataforma => { if (plataforma) { plataforma.style.backgroundColor = '#3a2820'; plataforma.style.boxShadow = 'none'; } });
      if (movel.current) movel.current.style.transform = '';
      if (sombra.current) sombra.current.style.transform = '';
      if (cabeca.current) cabeca.current.style.transform = '';
      if (pe.current) pe.current.style.transform = '';
      return;
    }
    let quadro = 0;
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inicio = inicioMs ?? (inicioLocal.current ??= performance.now());
    let ultimo = -1;
    const animar = (agora: number) => {
      const pos = Math.max(0, (agora - inicio) / (60000 / Math.max(40, Math.min(500, bpm))));
      const tempo = Math.floor(pos);
      const fase = pos - tempo;
      const atual = tempo % Math.max(1, compasso);
      if (tempo !== ultimo) {
        ultimo = tempo;
        luzes.current.forEach((luz, i) => {
          if (!luz) return;
          luz.style.backgroundColor = i === atual ? (atual === 0 ? '#ffcc22' : '#ff6b00') : '#3a2820';
          luz.style.boxShadow = i === atual ? `0 0 12px ${atual === 0 ? '#ffcc22' : '#ff6b00'}` : 'none';
        });
        plataformas.current.forEach((plataforma, i) => {
          if (!plataforma) return;
          plataforma.style.backgroundColor = i === atual ? (atual === 0 ? '#ffcc22' : '#ff6b00') : '#3a2820';
          plataforma.style.boxShadow = i === atual ? `0 0 14px ${atual === 0 ? '#ffcc22' : '#ff6b00'}` : 'none';
        });
      }
      if (!reduzido && movel.current) {
        if (estilo === 'pendulo') {
          movel.current.style.transform = `rotate(${Math.cos(pos * Math.PI) * 28}deg)`;
        } else if (estilo === 'bolinha') {
          const largura = caixa.current?.clientWidth ?? 240;
          const passo = largura / Math.max(1, compasso);
          const x = passo * (atual + .5) + passo * (((atual + 1) % compasso) - atual) * fase;
          const salto = Math.sin(fase * Math.PI) * (compacto ? 30 : 70 * Math.min(1, 120 / bpm * 1.2) + 20);
          movel.current.style.transform = `translate(${x - (compacto ? 10 : 13)}px, ${-salto}px)`;
          if (sombra.current) {
            sombra.current.style.transform = `translateX(${x - (compacto ? 12 : 15)}px)`;
            sombra.current.style.opacity = String(Math.max(.2, 1 - salto / 140));
          }
        }
      }
      if (!reduzido && estilo === 'mascote') {
        const bate = Math.max(0, 1 - fase * 4);
        if (cabeca.current) cabeca.current.style.transform = `rotate(${(atual % 2 ? -1 : 1) * 6 * bate}deg) translateY(${bate * 4}px)`;
        if (pe.current) pe.current.style.transform = `rotate(${-18 * (1 - bate)}deg)`;
      }
      quadro = requestAnimationFrame(animar);
    };
    quadro = requestAnimationFrame(animar);
    return () => cancelAnimationFrame(quadro);
  }, [ligado, inicioMs, bpm, estilo, compacto, compasso]);

  const total = Math.max(1, compasso);
  const luz = (i: number) => <div key={i} ref={el => { luzes.current[i] = el; }} className={`${compacto ? 'h-2.5 w-2.5' : 'h-5 w-5'} border-2 border-black bg-[#3a2820]`} />;
  return <div className={`${compacto ? 'w-full min-w-[120px]' : 'w-full max-w-[390px]'} ${ligado ? '' : 'grayscale opacity-55'} text-white`} aria-label={`Metrônomo ${estilo}, ${bpm} BPM, ${ligado ? 'ligado' : 'desligado'}`}>
    {estilo === 'bolinha' && <>
      <div ref={caixa} className={`relative w-full border-b-4 border-black ${compacto ? 'h-14' : 'h-36'}`}>
        <div className="absolute inset-x-0 bottom-0 flex justify-around">{Array.from({ length: total }, (_, i) => <div key={i} ref={el => { plataformas.current[i] = el; }} className={`${compacto ? 'w-8 h-2.5' : 'w-12 h-3'} border-2 border-black bg-[#3a2820]`} />)}</div>
        <div ref={sombra} className="absolute bottom-0 left-0 w-[30px] h-1 bg-black/40 rounded-full" />
        <div ref={movel} className={`absolute left-0 bottom-2 ${compacto ? 'w-5 h-5' : 'w-[26px] h-[26px]'} bg-white border-[3px] border-black shadow-[3px_3px_0_#000]`} />
      </div>
    </>}
    {estilo === 'pendulo' && <div className={`relative mx-auto ${compacto ? 'h-14 w-20' : 'h-[230px] w-[180px] mt-3'}`}>
      <div className="absolute bottom-0 inset-x-0 h-[86%] bg-gradient-to-r from-[#7a3d12] via-[#b5651d] to-[#8a4a18] [clip-path:polygon(30%_0,70%_0,100%_100%,0_100%)]" />
      <div className="absolute bottom-[12%] left-[42%] w-[16%] h-[55%] bg-[repeating-linear-gradient(#ffcc22_0_2px,transparent_2px_12px)] opacity-60" />
      <div ref={movel} className="absolute bottom-[16%] left-1/2 -ml-[3px] w-[6px] h-[70%] origin-bottom bg-[#e8d7ce] border-2 border-black"><div className="absolute left-1/2 -translate-x-1/2 w-7 h-5 bg-[#ffcc22] border-[3px] border-black shadow-[2px_2px_0_#ad6900]" style={{ top: `${Math.max(4, Math.min(130, 150 - (500 - bpm) / 460 * 140)) / 170 * 75}%` }} /></div>
      <div className="absolute bottom-0 -left-2 -right-2 h-3 bg-[#4a2610] border-2 border-black" />
    </div>}
    {estilo === 'mascote' && <div className={`relative mx-auto ${compacto ? 'w-14 h-14' : 'w-40 h-44 mt-3'}`}>
      <div ref={cabeca} className="absolute left-[28%] top-[7%] w-[44%] h-[35%] bg-[#f2b48a] border-4 border-black origin-bottom"><div className="absolute -top-4 -left-1 -right-1 h-5 bg-[#3a1d0e] border-4 border-black" /><div className="absolute top-[42%] left-[22%] w-2 h-2 bg-black shadow-[23px_0_0_#000]" /><div className="absolute bottom-2 left-[38%] w-4 h-1 bg-black" /><div className="absolute top-2 -left-4 w-4 h-7 bg-[#ff6b00] border-4 border-black shadow-[70px_0_0_#ff6b00]" /></div>
      <div className="absolute left-[24%] top-[43%] w-[52%] h-[35%] bg-[#ff6b00] border-4 border-black" /><div className="absolute left-[30%] top-[76%] w-5 h-8 bg-[#2b4a8a] border-4 border-black" /><div className="absolute right-[30%] top-[76%] w-5 h-8 bg-[#2b4a8a] border-4 border-black"><div ref={pe} className="absolute -bottom-3 -left-2 w-8 h-3 bg-black origin-left" /></div>
    </div>}
    <div className={`flex justify-center ${compacto ? 'gap-1 mt-1' : 'gap-3 mt-3'}`}>{Array.from({ length: total }, (_, i) => luz(i))}</div>
  </div>;
}
