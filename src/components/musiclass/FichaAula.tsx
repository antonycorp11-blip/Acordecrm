import React from 'react';
import { ChordVisualizer } from './ChordVisualizers';
import MelodiaBimanual from './MelodiaBimanual';
import { getMediaStreamUrl } from '../../utils/mediaUtils';

// Ficha da aula em formato limpo e legível (celular, tablet e PDF).
// Cada bloco tem data-pdf-bloco para o PDF nunca cortar um bloco no meio da página.

export function lerFichaAula(conteudo: any): any {
  const txt = String(conteudo || '').trim();
  if (txt.startsWith('{') && txt.endsWith('}')) {
    try { const r = JSON.parse(txt); if (r && r.isRich) return r; } catch { /* texto comum */ }
  }
  return { isRich: false, conteudoText: txt };
}

const nomeAcorde = (c: any) => {
  if (c?.name) return c.name;
  if (c?.isCustom) return c.root || '';
  const tipo = c?.typeId === 'min' ? 'm' : c?.typeId && !['maj', 'custom', 'cifra'].includes(c.typeId) ? c.typeId : '';
  const ext = c?.extId && c.extId !== 'none' ? c.extId : '';
  const baixo = c?.bass && c.bass !== 'none' ? `/${c.bass}` : '';
  return `${c?.root || ''}${tipo}${ext}${baixo}`;
};

const comLinks = (text: string) => {
  const partes = String(text || '').split(/(https?:\/\/[^\s]+)/g);
  return partes.map((p, i) => /^https?:\/\//.test(p)
    ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline break-all">{p}</a>
    : <React.Fragment key={i}>{p}</React.Fragment>);
};

const PARTES_BATERIA = ['Bumbo', 'Caixa', 'Chimbal', 'Aro'];

function Bloco({ titulo, children, destaque }: { titulo: string; children: React.ReactNode; destaque?: boolean }) {
  return (
    <section
      data-pdf-bloco
      className={`rounded-xl border-2 p-4 ${destaque ? 'border-[#c2410c] bg-[#fff7ed]' : 'border-gray-300 bg-white'}`}
      style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
    >
      <h3 className={`text-sm font-extrabold uppercase tracking-wide mb-2 ${destaque ? 'text-[#c2410c]' : 'text-gray-800'}`}>{titulo}</h3>
      {children}
    </section>
  );
}

export default function FichaAula({
  aula,
  alunoNome,
  professorNome,
  instrumento,
  modoPdf = false,
}: {
  aula: any;
  alunoNome?: string;
  professorNome?: string;
  instrumento?: string;
  modoPdf?: boolean;
}) {
  const r = lerFichaAula(aula?.conteudo);
  const texto = String(r.conteudoText || '').trim();
  const tarefa = String(r.tarefaCasaText || aula?.tarefa_casa || '').trim();
  const inst = instrumento || aula?.curso_nome || 'Música';
  const dataTxt = (() => {
    try {
      const [y, m, d] = String(aula?.data || '').split('T')[0].split('-').map(Number);
      if (!y) return '';
      return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    } catch { return ''; }
  })();
  let midias: any[] = [];
  try { midias = typeof aula?.midias === 'string' ? JSON.parse(aula.midias) : (Array.isArray(aula?.midias) ? aula.midias : []); } catch { midias = []; }

  const acordesPorParte: Record<string, any[]> = {};
  (r.chords || []).forEach((c: any) => {
    const g = String(c.group || 'Acordes').toUpperCase();
    (acordesPorParte[g] = acordesPorParte[g] || []).push(c);
  });

  return (
    <div className="ficha-aula space-y-4 text-gray-900 bg-[#fafaf9] font-['Inter',system-ui,sans-serif]" style={{ colorScheme: 'light' }}>
      {/* Cabeçalho */}
      <header data-pdf-bloco className="rounded-xl bg-[#1c1917] text-white p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-orange-300">Studio Acorde · Ficha da aula</p>
        <h2 className="text-xl font-extrabold leading-tight mt-1">Aula de {inst}</h2>
        {dataTxt && <p className="text-sm text-gray-300 capitalize mt-0.5">{dataTxt}</p>}
        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
          {alunoNome && <div><p className="text-[10px] uppercase text-gray-400 font-bold">Aluno(a)</p><p className="font-bold">{alunoNome}</p></div>}
          {professorNome && <div><p className="text-[10px] uppercase text-gray-400 font-bold">Professor(a)</p><p className="font-bold">{professorNome}</p></div>}
        </div>
      </header>

      <Bloco titulo="📚 Hoje aprendemos">
        <p className="text-base leading-relaxed whitespace-pre-wrap">{texto ? comLinks(texto) : 'O professor ainda não escreveu o resumo desta aula.'}</p>
      </Bloco>

      {tarefa && (
        <Bloco titulo="🏠 Tarefa de casa" destaque>
          <p className="text-base leading-relaxed whitespace-pre-wrap font-medium">{comLinks(tarefa)}</p>
        </Bloco>
      )}

      {Object.entries(acordesPorParte).map(([grupo, lista]) => (
        <Bloco key={grupo} titulo={`🎸 ${grupo === 'ACORDES' ? 'Acordes' : grupo}`}>
          <p className="text-base font-bold mb-3">{lista.map(nomeAcorde).join('  ·  ')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={modoPdf ? { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } : undefined}>
            {lista.map((c: any, i: number) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-2 flex flex-col items-center" style={{ breakInside: 'avoid' }}>
                <span className="text-sm font-extrabold mb-1">{nomeAcorde(c)}</span>
                <div className="w-full">
                  <ChordVisualizer
                    instrument={c.instrument || inst}
                    chordNotes={c.notes || []}
                    root={c.root}
                    type={c.typeId}
                    ext={c.extId}
                    bass={c.bass}
                    notesWithIndices={c.notesWithIndices}
                    isCustom={c.isCustom}
                    name={c.name}
                  />
                </div>
              </div>
            ))}
          </div>
        </Bloco>
      ))}

      {Array.isArray(r.melody) && r.melody.map((mel: any, i: number) => (
        <Bloco key={`mel-${i}`} titulo="🎹 Melodia">
          <MelodiaBimanual mel={mel} />
        </Bloco>
      ))}

      {Array.isArray(r.scales) && r.scales.length > 0 && (
        <Bloco titulo="🎼 Escalas">
          <div className="space-y-2">
            {r.scales.map((sc: any, i: number) => (
              <div key={i}>
                <p className="font-bold">{sc.root} {sc.scaleName}</p>
                <p className="text-sm text-gray-700">{(sc.notes || []).map((n: string) => String(n).replace(/\d+$/, '')).join(' – ')}</p>
              </div>
            ))}
          </div>
        </Bloco>
      )}

      {Array.isArray(r.tablatures) && r.tablatures.map((tab: any, i: number) => {
        const cols = Math.max(16, ...((tab.matrix || []).map((l: any[]) => l?.length || 0)));
        return (
          <Bloco key={`tab-${i}`} titulo={`🎶 Tablatura${tab.name ? ` · ${tab.name}` : ''}`}>
            <div className={modoPdf ? '' : 'overflow-x-auto'}>
              <table className="border-collapse font-mono text-xs" style={{ minWidth: modoPdf ? undefined : `${cols * 20 + 24}px`, width: modoPdf ? '100%' : undefined }}>
                <tbody>
                  {['e', 'B', 'G', 'D', 'A', 'E'].map((corda, ci) => (
                    <tr key={ci}>
                      <td className="pr-2 font-bold text-gray-500">{corda}</td>
                      {Array.from({ length: cols }).map((_, b) => (
                        <td key={b} className="text-center border-b border-gray-300 h-5 min-w-[18px] font-bold">{tab.matrix?.[ci]?.[b] || ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Bloco>
        );
      })}

      {Array.isArray(r.drums) && r.drums.length > 0 && (
        <Bloco titulo="🥁 Ritmos">
          <div className="space-y-3">
            {r.drums.map((d: any, i: number) => (
              <div key={i}>
                <p className="font-bold">{d.name || d.pattern || `Ritmo ${i + 1}`}{d.bpm ? ` · ${d.bpm} BPM` : ''}</p>
                {Array.isArray(d.matrix) && (
                  <table className="border-collapse text-[10px] mt-1">
                    <tbody>
                      {d.matrix.map((linha: boolean[], li: number) => (
                        <tr key={li}>
                          <td className="pr-2 font-bold text-gray-600">{PARTES_BATERIA[li] || ''}</td>
                          {linha.map((on, b) => (
                            <td key={b} className={`w-4 h-4 border border-gray-300 ${on ? 'bg-gray-900' : ''} ${b % 4 === 0 ? 'border-l-gray-500' : ''}`} />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </Bloco>
      )}

      {Array.isArray(r.exercises) && r.exercises.length > 0 && (
        <Bloco titulo="🏆 Desafios">
          <ul className="space-y-2">
            {r.exercises.map((ex: any, i: number) => (
              <li key={i}>
                <p className="font-bold">{ex.title || ex.titulo}{ex.points ? ` · +${ex.points} pontos` : ''}</p>
                {(ex.description || ex.desc) && <p className="text-sm text-gray-700 whitespace-pre-wrap">{ex.description || ex.desc}</p>}
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      {Array.isArray(r.recordings) && r.recordings.length > 0 && (
        <Bloco titulo="🎙️ Áudios da aula">
          <div className="space-y-2">
            {r.recordings.map((rec: any, i: number) => (
              <div key={i}>
                <p className="text-sm font-bold">{rec.name || `Áudio ${i + 1}`}</p>
                {modoPdf
                  ? <p className="text-xs text-gray-600">Ouça no app do Studio Acorde.</p>
                  : <audio src={getMediaStreamUrl(rec.url)} controls className="w-full h-9" />}
              </div>
            ))}
          </div>
        </Bloco>
      )}

      {midias.length > 0 && (
        <Bloco titulo="🔗 Links">
          <ul className="space-y-1">
            {midias.map((m: any, i: number) => (
              <li key={i} className="text-sm"><span className="font-bold">{m.titulo || 'Link'}:</span> <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline break-all">{m.url}</a></li>
            ))}
          </ul>
        </Bloco>
      )}

      {Array.isArray(r.images) && r.images.length > 0 && (
        <Bloco titulo="📸 Imagens">
          <div className="grid grid-cols-2 gap-2">
            {r.images.map((img: string, i: number) => <img key={i} src={img} alt="" className="w-full h-auto rounded border border-gray-200" crossOrigin="anonymous" />)}
          </div>
        </Bloco>
      )}
    </div>
  );
}
