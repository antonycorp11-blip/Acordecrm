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

const CASAS = Array.from({ length: 17 }, (_, i) => i);
const CORDAS = [1, 2, 3, 4, 5, 6];
const X = CASAS.map(casa => 44 + 1700 * (1 - Math.pow(2, -casa / 12)) * .95);
const W = X[16] + 28;
const yCorda = (corda: number) => 34 + (corda - 1) * 24;
const xCasa = (casa: number) => casa === 0 ? 20 : (X[casa - 1] + X[casa]) / 2;

export default function ViolaoPixel({ esperadas = [], proximas = [], midiOuvido, posicaoOuvida, aoEscolher, efeito }: Props) {
  const rolagem = useRef<HTMLDivElement>(null);
  const principal = esperadas[0];
  const ouvida = posicaoOuvida ?? (midiOuvido == null ? null : estimarPosicao(midiOuvido, principal));
  const acertou = midiOuvido != null && esperadas.some(p => posicaoOuvida
    ? p.corda === posicaoOuvida.corda && p.casa === posicaoOuvida.casa
    : midiNaPosicao(p.corda, p.casa) === midiOuvido);

  useEffect(() => {
    if (!rolagem.current || !principal) return;
    const alvo = xCasa(principal.casa) / W * rolagem.current.scrollWidth - rolagem.current.clientWidth / 3;
    rolagem.current.scrollTo({ left: Math.max(0, alvo), behavior: 'smooth' });
  }, [principal?.casa, principal?.corda]);

  return <div className="relative w-full min-w-0 border-4 border-black bg-[#1a0f0a] text-[#fff8f6] p-2 shadow-[4px_4px_0_#000]">
    <style>{`@keyframes pv-brilho { 0% { opacity: 0; transform: scale(.7) } 30% { opacity: 1 } 100% { opacity: 0; transform: scale(1.4) } } @keyframes pv-tremida { 25% { transform: translateX(-3px) } 50% { transform: translateX(3px) } 75% { transform: translateX(-2px) } } @media (prefers-reduced-motion: reduce) { .pv-efeito, .pv-tremer { animation: none !important } }`}</style>
    <div className="flex justify-between gap-2 items-center mb-2 text-xs font-black uppercase"><span>Violão</span><span className="text-right">● Agora · ◇ Depois</span></div>
    {efeito?.tipo === 'acerto' && <div key={efeito.id} className="pv-efeito pointer-events-none absolute inset-0 z-20 border-4 border-[#ffcc22]" style={{ animation: 'pv-brilho .55s ease-out both' }} aria-hidden="true" />}
    {efeito?.tipo === 'erro' && <div key={efeito.id} className="pv-tremer pointer-events-none absolute inset-0 z-20 border-4 border-red-500" style={{ animation: 'pv-tremida .25s ease-out' }} aria-hidden="true" />}
    <div ref={rolagem} className="w-full overflow-x-auto overscroll-x-contain" aria-label="Braço do violão, da primeira à sexta corda">
      <svg viewBox={`0 0 ${W} 198`} className="block h-[170px] md:landscape:h-[min(34vh,240px)] w-auto max-w-none" role="img" aria-label="Braço do violão com casas e cordas">
        <defs><linearGradient id="pv-madeira" x2="0" y2="1"><stop stopColor="#3b1f12" /><stop offset=".5" stopColor="#4e2a17" /><stop offset="1" stopColor="#3b1f12" /></linearGradient><pattern id="pv-veio" width="60" height="8" patternUnits="userSpaceOnUse"><path d="M0 4 Q15 1 30 4 T60 4" stroke="#2a150c" fill="none" opacity=".6" /></pattern><linearGradient id="pv-bronze" x2="0" y2="1"><stop stopColor="#f3d39a" /><stop offset="1" stopColor="#9a6b2e" /></linearGradient></defs>
        <rect x="0" y="16" width={W} height="146" fill="url(#pv-madeira)" stroke="black" strokeWidth="4" /><rect x="0" y="16" width={W} height="146" fill="url(#pv-veio)" />
        <rect x="0" y="12" width="44" height="154" fill="#c9a26b" stroke="black" strokeWidth="3" /><rect x="39" y="12" width="10" height="154" fill="#f4ecd8" stroke="black" strokeWidth="2" />
        {[3, 5, 7, 9].map(casa => <circle key={casa} cx={xCasa(casa)} cy="89" r="7" fill="#efe6d2" stroke="black" />)}
        {[65, 113].map(y => <circle key={y} cx={xCasa(12)} cy={y} r="7" fill="#efe6d2" stroke="black" />)}
        {CASAS.slice(1).map(casa => <g key={casa}><rect x={X[casa] - 2.5} y="16" width="5" height="146" fill="#d7d2c8" stroke="#555" strokeWidth=".8" /><text x={xCasa(casa)} y="186" fill="#c9b3a8" fontSize="9" fontFamily="'Press Start 2P', monospace" textAnchor="middle">{casa}</text></g>)}
        {CORDAS.map(corda => <g key={corda}><rect x="0" y={yCorda(corda) - (corda > 3 ? corda * .55 : corda * .3) / 2} width={W} height={corda > 3 ? corda * .55 : corda * .3} fill={corda > 3 ? 'url(#pv-bronze)' : '#e8e3dc'} /><text x="10" y={yCorda(corda) + 3} fontSize="8" fontFamily="'Press Start 2P', monospace" fill="#1a0f0a">{'EBGDAE'[corda - 1]}</text></g>)}
        {CORDAS.flatMap(corda => CASAS.map(casa => {
          const esperada = esperadas.find(p => p.corda === corda && p.casa === casa);
          const proxima = proximas.some(p => p.corda === corda && p.casa === casa);
          const tocada = ouvida?.corda === corda && ouvida.casa === casa;
          const cx = xCasa(casa), cy = yCorda(corda);
          return <g key={`${corda}-${casa}`} onClick={() => aoEscolher?.({ corda, casa })} style={{ cursor: aoEscolher ? 'pointer' : 'default' }}><title>{`${corda}ª corda, ${casa === 0 ? 'solta' : `${casa}ª casa`}${esperada?.dedo ? `, dedo ${esperada.dedo}` : ''}`}</title><rect x={casa === 0 ? 0 : X[casa - 1]} y={cy - 12} width={casa === 0 ? 44 : X[casa] - X[casa - 1]} height="24" fill="transparent" />{(esperada || proxima || tocada) && <><circle cx={cx} cy={cy} r="14" fill={tocada ? acertou ? '#2ecc71' : '#d53430' : esperada ? '#ff6b00' : 'transparent'} stroke={proxima && !esperada && !tocada ? '#ffcc22' : '#fff'} strokeWidth="3" strokeDasharray={proxima && !esperada && !tocada ? '4 3' : undefined} /><text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="900">{tocada && ouvida && ouvida.confianca < .55 ? '?' : esperada?.dedo ?? (tocada ? '♪' : '')}</text></>}</g>;
        }))}
      </svg>
    </div>
    <p className="text-xs font-semibold mt-2">1ª corda Mi agudo em cima · 6ª Mi grave embaixo · deslize para ver as casas.</p>
  </div>;
}
