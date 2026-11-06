import { useEffect, useRef } from 'react';
import type { PosicaoViolao } from '../lib/professorVirtual/violao';
import { estimarPosicao, midiNaPosicao, type EstimativaPosicao } from '../lib/professorVirtual/violao';

type Props = {
  esperadas?: PosicaoViolao[];
  proximas?: PosicaoViolao[];
  midiOuvido?: number | null;
  posicaoOuvida?: EstimativaPosicao | null;
  aoEscolher?: (posicao: PosicaoViolao) => void;
  efeito?: { tipo: 'acerto' | 'erro'; id: number } | null;
};

const CASAS = Array.from({ length: 16 }, (_, i) => i);
const CORDAS = [1, 2, 3, 4, 5, 6];

export default function ViolaoPixel({ esperadas = [], proximas = [], midiOuvido, posicaoOuvida, aoEscolher, efeito }: Props) {
  const rolagem = useRef<HTMLDivElement>(null);
  const principal = esperadas[0];
  const ouvida = posicaoOuvida ?? (midiOuvido == null ? null : estimarPosicao(midiOuvido, principal));
  const acertou = midiOuvido != null && esperadas.some((p) => posicaoOuvida
    ? p.corda === posicaoOuvida.corda && p.casa === posicaoOuvida.casa
    : midiNaPosicao(p.corda, p.casa) === midiOuvido);

  useEffect(() => {
    if (!rolagem.current || !principal) return;
    const alvo = Math.max(0, principal.casa - 2) * 52;
    rolagem.current.scrollTo({ left: alvo, behavior: 'smooth' });
  }, [principal?.casa, principal?.corda]);

  return (
    <div className="relative border-4 border-black bg-[#fff5df] text-[#261812] p-2 shadow-[4px_4px_0_#000]">
      <style>{`@keyframes pv-brilho { 0% { opacity: 0; transform: scale(.7) } 30% { opacity: 1 } 100% { opacity: 0; transform: scale(1.4) } } @keyframes pv-moeda { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(-55px) } } @keyframes pv-tremida { 25% { transform: translateX(-3px) } 50% { transform: translateX(3px) } 75% { transform: translateX(-2px) } } .pv-tremer { animation: pv-tremida .25s ease-out } @media (prefers-reduced-motion: reduce) { .pv-efeito { animation: none !important; display: none } .pv-tremer { animation: none !important } }`}</style>
      {efeito?.tipo === 'acerto' && <div key={efeito.id} className="pv-efeito absolute inset-0 pointer-events-none z-20 border-4 border-yellow-300" style={{ animation: 'pv-brilho .55s ease-out both' }} aria-hidden="true"><span className="absolute left-1/2 top-1/2 w-5 h-5 bg-yellow-300 border-[3px] border-black shadow-[3px_3px_0_#ad6900]" style={{ animation: 'pv-moeda .7s ease-out both', imageRendering: 'pixelated' }} />{[0, 1, 2, 3].map(i => <span key={i} className="absolute text-yellow-400" style={{ left: `${25 + i * 16}%`, top: `${20 + (i % 2) * 40}%`, animation: `pv-brilho .5s ${i * 0.05}s ease-out both` }}>✦</span>)}</div>}
      {efeito?.tipo === 'erro' && <div key={efeito.id} className="pv-efeito pv-tremer absolute inset-0 pointer-events-none z-20 border-4 border-red-500" aria-hidden="true" />}
      <div className="flex justify-between gap-2 items-center mb-2 text-xs font-black uppercase">
        <span>Violão virtual</span>
        <span className="text-right">● Toque agora · ◇ Depois</span>
      </div>
      <div ref={rolagem} className="overflow-x-auto overscroll-x-contain" aria-label="Braço do violão, da primeira à sexta corda">
        <div className="w-max border-4 border-[#452517] bg-[#9a5b32]" style={{ imageRendering: 'pixelated' }}>
          {CORDAS.map((corda) => (
            <div key={corda} className="flex h-11 border-b-2 last:border-b-0 border-[#704020]">
              {CASAS.map((casa) => {
                const esperada = esperadas.find((p) => p.corda === corda && p.casa === casa);
                const proxima = proximas.some((p) => p.corda === corda && p.casa === casa);
                const tocada = ouvida?.corda === corda && ouvida.casa === casa;
                const marcador = tocada ? esperadas.length ? 'bg-[#d53430] text-white' : 'bg-[#65b8f0] text-black' : esperada ? 'bg-[#ffcc22] text-black animate-pulse' : proxima ? 'bg-[#ffe9a2] text-[#5c3d19]' : '';
                const marcadorFinal = tocada && ouvida && ouvida.confianca < 0.55 ? 'bg-white text-[#6b4a00] border-dashed' : tocada && acertou ? 'bg-[#2caa52] text-white' : marcador;
                return (
                  <button
                    key={casa}
                    type="button"
                    disabled={!aoEscolher}
                    onClick={() => aoEscolher?.({ corda, casa })}
                    aria-label={`${corda}ª corda, ${casa === 0 ? 'solta' : `${casa}ª casa`}${esperada ? `, dedo ${esperada.dedo ?? 'não definido'}` : ''}`}
                    className={`relative w-[52px] h-11 shrink-0 border-r-[3px] border-[#e9c89c] flex items-center justify-center ${casa === 0 ? 'bg-[#d6b58e] border-r-[6px] border-[#271b16]' : ''} ${aoEscolher ? 'cursor-pointer active:bg-[#f1a95b]' : 'cursor-default'}`}
                  >
                    {[3, 5, 7, 9, 12].includes(casa) && (corda === 3 || corda === 4) && <span className="absolute w-2 h-2 bg-[#e9bc78] rotate-45" />}
                    <span className={`absolute inset-x-0 top-1/2 h-[2px] ${corda > 3 ? 'bg-[#e7d4ae]' : 'bg-[#fff0cb]'} shadow-[0_1px_0_#423025]`} />
                    {(esperada || proxima || tocada) && (
                      <span className={`relative z-10 min-w-7 h-7 px-1 flex items-center justify-center border-2 border-black shadow-[2px_2px_0_#25180d] text-sm font-black ${marcadorFinal}`}>
                        {tocada && ouvida && ouvida.confianca < 0.55 ? '?' : esperada?.dedo ?? (tocada ? '♪' : proxima ? '◇' : '●')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="flex bg-[#fff0d4] border-t-2 border-[#452517]">
            {CASAS.map((casa) => <span key={casa} className="w-[52px] text-center text-xs font-black py-0.5">{casa}</span>)}
          </div>
        </div>
      </div>
      <p className="text-xs font-semibold mt-2">1ª corda Mi agudo em cima · 6ª Mi grave embaixo · deslize para ver as casas.</p>
    </div>
  );
}
