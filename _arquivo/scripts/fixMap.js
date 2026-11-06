const fs = require('fs');
const file = './src/pages/AreaAluno.tsx';
let content = fs.readFileSync(file, 'utf8');

const startTag = `                {modulosCompletos.map((modulo, modIdx) => {`;
const endTag = `                {modulosCompletos.length === 0 && (`;
const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if(startIndex === -1 || endIndex === -1) {
  console.log("Not found");
  process.exit(1);
}

const mapLogic = `
                {/* Lógica Contínua de Mapa */}
                <div className="relative w-full overflow-hidden" style={{ minHeight: '800px' }}>
                  {(() => {
                    let globalY = 0;
                    const nodes = [];
                    const biomes = [];
                    let lastX = 100;
                    let lastY = 0;
                    let svgPaths = [];

                    modulosCompletos.forEach((modulo, modIdx) => {
                      const modAulas = aulasCompletas.filter(a => String(a.modulo_id) === String(modulo.id));
                      const isEmProducao = modulo.em_producao;

                      const isModuloDesbloqueado = !isEmProducao && (modIdx === 0 || (() => {
                        const modAnterior = modulosCompletos[modIdx - 1];
                        const aulasModAnterior = aulasCompletas.filter(a => String(a.modulo_id) === String(modAnterior.id));
                        const todasConcluidas = aulasModAnterior.length > 0 && aulasModAnterior.every(a => trilhaProgresso.some(p => Number(p.aula_id) === Number(a.id)));
                        const provaConcluida = !modAnterior.prova_final || (Array.isArray(modAnterior.prova_final) && modAnterior.prova_final.length === 0) || (alunoData?.conquistas?.some((c: any) => Number(c.id) === Number(modAnterior.conquista_id) || Number(c.conquista_id) === Number(modAnterior.conquista_id)));
                        return todasConcluidas && provaConcluida;
                      })());

                      let biomeLabelBg = 'bg-[#ff6b00]';
                      let biomeLabelText = 'text-white';
                      let biomeLabelRotate = '-rotate-2';
                      let biomeTitle = modulo.nome;
                      let biomeGradient = 'from-[#1a0f0a] to-[#1e0808]';
                      let decors = null;

                      const themeIndex = modIdx % 3;
                      if (themeIndex === 0) {
                        biomeGradient = 'from-[#1a0f0a] to-[#1e0808]';
                        biomeLabelBg = 'bg-[#ff6b00]';
                        biomeLabelRotate = '-rotate-2';
                        biomeTitle = \`FLORESTA SYNTHWAVE: \${modulo.nome}\`;
                        decors = <div className="absolute top-10 left-6 opacity-40 text-4xl pointer-events-none floating-sticker-stitch"><span className="material-symbols-outlined text-[#ff6b00] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>album</span></div>;
                      } else if (themeIndex === 1) {
                        biomeGradient = 'from-[#1e0808] to-[#111625]';
                        biomeLabelBg = 'bg-[#ba1a1a]';
                        biomeLabelRotate = 'rotate-2';
                        biomeTitle = \`VULCÃO HEAVY METAL: \${modulo.nome}\`;
                        decors = <div className="absolute top-20 right-6 opacity-30 text-4xl pointer-events-none floating-sticker-stitch"><span className="material-symbols-outlined text-[#ba1a1a] text-4xl">skull</span></div>;
                      } else {
                        biomeGradient = 'from-[#111625] to-[#1a0f0a]';
                        biomeLabelBg = 'bg-[#e2e2e2]';
                        biomeLabelText = 'text-black';
                        biomeLabelRotate = '-rotate-1';
                        biomeTitle = \`CÉU CLÁSSICO: \${modulo.nome}\`;
                        decors = <div className="absolute top-10 right-10 opacity-20 text-4xl pointer-events-none floating-sticker-stitch"><span className="material-symbols-outlined text-white text-4xl">cloud</span></div>;
                      }

                      const startY = globalY;
                      
                      // Title Tag no SVG path
                      globalY += 60;
                      svgPaths.push(\`C \${lastX} \${lastY + 30}, 100 \${globalY - 30}, 100 \${globalY}\`);
                      lastX = 100;
                      lastY = globalY;

                      nodes.push(
                        <div key={\`label-\${modulo.id}\`} className={\`absolute left-1/2 -translate-x-1/2 w-max max-w-[90%] z-20 \${(!isModuloDesbloqueado && !isEmProducao) ? 'opacity-30' : ''} \${isEmProducao ? 'opacity-70' : ''}\`} style={{ top: \`\${globalY}px\` }}>
                          <div className={\`\${biomeLabelBg} \${biomeLabelText} px-6 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(38,24,18,1)] \${biomeLabelRotate} text-center min-w-[220px] relative transition-all\`}>
                            {isEmProducao && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ba1a1a] text-white border border-black text-[7px] px-1.5 py-0.5 font-black uppercase tracking-widest whitespace-nowrap">🛠️ EM BREVE</span>}
                            <h2 className="font-['Space_Mono'] font-bold uppercase tracking-tighter text-[10px] sm:text-xs">{biomeTitle}</h2>
                          </div>
                        </div>
                      );

                      globalY += 80;

                      modAulas.forEach((aula, aIdx) => {
                        const targetX = (aIdx % 2 === 0) ? 35 : 65; // zigzag esq dir em porcentagem 0-100
                        const svgX = targetX * 2; // Para o SVG viewBox de 200
                        
                        svgPaths.push(\`C \${lastX} \${lastY + 40}, \${svgX} \${globalY - 40}, \${svgX} \${globalY}\`);
                        lastX = svgX;
                        lastY = globalY;

                        const isAulaEmProducao = aula.em_producao;
                        const isConcluida = !isAulaEmProducao && trilhaProgresso.some(p => Number(p.aula_id) === Number(aula.id));
                        const isAulaDesbloqueada = !isAulaEmProducao && isModuloDesbloqueado && (aIdx === 0 || trilhaProgresso.some(p => Number(p.aula_id) === Number(modAulas[aIdx - 1].id)));
                        const isAtiva = isAulaDesbloqueada && !isConcluida;

                        nodes.push(
                          <div key={\`aula-\${aula.id}\`} className={\`absolute -translate-x-1/2 -translate-y-1/2 z-30 transition-all \${(!isModuloDesbloqueado && !isEmProducao) ? 'opacity-30' : ''}\`} style={{ top: \`\${globalY}px\`, left: \`\${targetX}%\` }}>
                            {isConcluida ? (
                              <button disabled={!isAulaDesbloqueada} onClick={() => { setSelectedTrilhaAula(aula); setVideoCompleto(false); setQuestionarioFinalizado(false); setQuestionarioCorreto(null); setQuestionarioRespostas({}); setCurrentQuestionIdx(0); setTentativaResultado(null); }} className="w-14 h-14 bg-[#a04100] rounded-full border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#261812] cursor-pointer hover:scale-110">
                                <span className="material-symbols-outlined text-white text-2xl">{obterIconeStitch(aula.titulo)}</span>
                              </button>
                            ) : isAtiva ? (
                              <div onClick={() => { setSelectedTrilhaAula(aula); setVideoCompleto(false); setQuestionarioFinalizado(false); setQuestionarioCorreto(null); setQuestionarioRespostas({}); setCurrentQuestionIdx(0); setTentativaResultado(null); }} className="active-node-stitch w-16 h-16 rounded-full border-4 border-black flex items-center justify-center cursor-pointer hover:scale-110 relative z-40">
                                <span className="material-symbols-outlined text-black text-3xl">{obterIconeStitch(aula.titulo)}</span>
                                <div className="absolute top-2 -right-32 whitespace-nowrap bg-[#ba1a1a] text-white px-2 py-1 border-2 border-black text-[8px] uppercase font-bold sticker-shadow-stitch -rotate-2"><span className="animate-ping mr-1">●</span>ATUAL: {aula.titulo}</div>
                              </div>
                            ) : isAulaEmProducao ? (
                              <button className="w-14 h-14 bg-[#2d221d] rounded-full border-2 border-black flex items-center justify-center opacity-60">
                                <span className="material-symbols-outlined text-[#5a4136] text-2xl">build</span>
                              </button>
                            ) : (
                              <button className="w-12 h-12 bg-[#3d2d26] rounded-full border-2 border-black flex items-center justify-center opacity-60 cursor-not-allowed">
                                <span className="material-symbols-outlined text-[#5a4136] text-xl">lock</span>
                              </button>
                            )}
                            
                            {!isAtiva && !isAulaEmProducao && (
                              <div className="absolute top-1/2 -translate-y-1/2 left-full ml-4 whitespace-nowrap bg-white border border-black text-[7px] font-black uppercase text-black px-1.5 py-0.5 shadow-[2px_2px_0_#261812] pointer-events-none opacity-50">{aula.titulo}</div>
                            )}
                          </div>
                        );
                        globalY += 120;
                      });

                      if (modulo.prova_final && modulo.prova_final.length > 0) {
                         svgPaths.push(\`C \${lastX} \${lastY + 40}, 100 \${globalY - 40}, 100 \${globalY}\`);
                         lastX = 100;
                         lastY = globalY;

                         const isProvaConcluida = alunoData?.conquistas?.some((c: any) => Number(c.id) === Number(modulo.conquista_id) || Number(c.conquista_id) === Number(modulo.conquista_id));
                         const isProvaDesbloqueada = !isEmProducao && isModuloDesbloqueado && (modAulas.length === 0 || modAulas.every(a => trilhaProgresso.some(p => Number(p.aula_id) === Number(a.id))));

                         nodes.push(
                           <div key={\`prova-\${modulo.id}\`} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-30" style={{ top: \`\${globalY}px\` }}>
                              <button disabled={!isProvaDesbloqueada} onClick={() => { setSelectedTrilhaModulo(modulo); setQuestionarioFinalizado(false); setQuestionarioCorreto(null); setQuestionarioRespostas({}); setCurrentQuestionIdx(0); setTentativaResultado(null); }} className={\`w-16 h-16 border-4 border-black flex items-center justify-center shadow-[6px_6px_0_rgba(0,0,0,0.5)] rounded-2xl \${isProvaConcluida ? 'bg-[#ffeb3b] text-black border-yellow-600 hover:scale-105' : isProvaDesbloqueada ? 'bg-[#ba1a1a] text-white hover:scale-105 animate-bounce' : 'bg-[#3d2d26] text-[#5a4136] opacity-60 cursor-not-allowed border-[#5a4136] shadow-none'}\`}>
                                <span className="material-symbols-outlined text-3xl">{isProvaConcluida ? 'grade' : 'grade'}</span>
                              </button>
                           </div>
                         );
                         globalY += 120;
                      }

                      biomes.push(
                        <div key={\`bg-\${modulo.id}\`} className={\`absolute w-full bg-gradient-to-b \${biomeGradient} left-0\`} style={{ top: \`\${startY}px\`, height: \`\${globalY - startY}px\` }}>
                          {decors}
                        </div>
                      );
                    });
                    
                    globalY += 50;

                    return (
                      <>
                        {biomes}
                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-80" viewBox={\`0 0 200 \${globalY}\`} preserveAspectRatio="none">
                           <path d={\`M 100 0 \${svgPaths.join(' ')}\`} fill="none" stroke="#5a4136" strokeWidth="8" strokeLinecap="round" />
                           <path d={\`M 100 0 \${svgPaths.join(' ')}\`} fill="none" stroke="#ff6b00" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6" className="animate-[path-glow-stitch_2s_infinite]" />
                        </svg>
                        {nodes}
                      </>
                    );
                  })()}
                </div>
`;

const newContent = content.substring(0, startIndex) + mapLogic + content.substring(endIndex);
fs.writeFileSync(file, newContent);
console.log("Rewrite success");
