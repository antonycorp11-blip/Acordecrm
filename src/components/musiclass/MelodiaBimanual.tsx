import React from 'react';

// Mostra uma melodia de teclado: notas da mão direita embaixo e,
// empilhadas em cima de cada uma, as notas da mão esquerda tocadas junto.
// Formato salvo: { name, notes: string[], phrases?: string[][], left?: string[][], phrasesLeft?: string[][][] }

const nomeNota = (n: string) => String(n || '').replace(/[\d*]+$/, '');
const ESCALA = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const alturaNota = (n: string) => {
  const m = String(n || '').match(/^([A-G]#?)(\d+)?/);
  return m ? Number(m[2] ?? 4) * 12 + ESCALA.indexOf(m[1]) : 0;
};

export function partesDaMelodia(mel: any): { direita: string[]; esquerda: string[][] }[] {
  const notes: string[] = Array.isArray(mel?.notes) ? mel.notes : [];
  const left: string[][] = Array.isArray(mel?.left) ? mel.left : [];
  if (Array.isArray(mel?.phrases) && mel.phrases.length > 1) {
    let offset = 0;
    return mel.phrases.map((ph: string[], i: number) => {
      const esquerda = Array.isArray(mel.phrasesLeft?.[i])
        ? mel.phrasesLeft[i]
        : left.slice(offset, offset + ph.length);
      offset += ph.length;
      return { direita: ph, esquerda };
    });
  }
  const direita = (Array.isArray(mel?.phrases) && mel.phrases[0]) || notes;
  return [{ direita, esquerda: (Array.isArray(mel?.phrasesLeft?.[0]) && mel.phrasesLeft[0]) || left }];
}

export function temMaoEsquerda(mel: any) {
  return partesDaMelodia(mel).some(p => p.esquerda.some(l => Array.isArray(l) && l.length > 0));
}

export default function MelodiaBimanual({ mel, tamanho = 'normal' }: { mel: any; tamanho?: 'normal' | 'pequeno' }) {
  const partes = partesDaMelodia(mel);
  const bimanual = temMaoEsquerda(mel);
  const nome = mel?.name || mel?.title || mel?.titulo;
  const peq = tamanho === 'pequeno';
  const chip = peq ? 'px-2 py-1 text-xs min-w-[32px]' : 'px-3 py-1.5 text-sm sm:text-base min-w-[40px]';

  return (
    <div className="space-y-3" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      {nome && nome !== 'NOVA MELODIA / GUIA' && (
        <p className="text-xs font-black uppercase text-[#c2410c]">{nome}</p>
      )}
      {bimanual && (
        <div className="flex flex-wrap gap-3 text-[11px] font-bold text-gray-700">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[#047857]" /> Mão esquerda (em cima)</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[#1e40af]" /> Mão direita (melodia)</span>
        </div>
      )}
      {partes.map((parte, pIdx) => (
        <div key={pIdx} className="space-y-2" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div className="flex items-center gap-2">
            <span className="text-[#c2410c] font-black text-xs uppercase tracking-wider">
              {partes.length > 1 ? `Parte ${pIdx + 1}` : 'Melodia'}
            </span>
            <div className="flex-1 border-t-2 border-dashed border-gray-300" />
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-3 items-end">
            {parte.direita.map((nota, nIdx) => {
              // a nota mais aguda fica em cima
              const esq = (Array.isArray(parte.esquerda[nIdx]) ? [...parte.esquerda[nIdx]] : []).sort((a, b) => alturaNota(b) - alturaNota(a));
              return (
                <div key={nIdx} className="flex flex-col items-center gap-1">
                  {esq.length > 0 ? (
                    <div className="flex flex-col items-center gap-0.5">
                      {esq.map((l, li) => (
                        <span key={li} className={`bg-[#047857] text-white rounded font-black uppercase text-center ${peq ? 'px-1.5 py-0.5 text-[10px] min-w-[28px]' : 'px-2 py-0.5 text-xs min-w-[34px]'}`}>
                          {nomeNota(l)}
                        </span>
                      ))}
                    </div>
                  ) : bimanual ? <span className={peq ? 'h-[18px]' : 'h-[20px]'} /> : null}
                  <span className={`bg-[#1e40af] text-white rounded-lg font-black uppercase flex items-center justify-center shadow-[0_3px_0_#1e3a8a] ${chip}`}>
                    {nomeNota(nota)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
