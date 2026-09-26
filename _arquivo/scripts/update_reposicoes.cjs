const fs = require('fs');

let code = fs.readFileSync('src/pages/Reposicoes.tsx', 'utf8');

const newCode = `
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-black text-white font-black flex items-center justify-center text-xl shrink-0">
                    {(aula.aluno_nome || 'A')[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-lg uppercase truncate">{aula.aluno_nome}</h3>
                    <p className="text-xs font-bold text-[#8e7164] uppercase flex items-center gap-1">
                      <User className="w-3 h-3" /> Prof. {aula.professor_nome || '?'}
                    </p>
                  </div>
                </div>

                <div className="bg-[#f4f4f5] p-3 border-2 border-black">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-[#ff6b00]" />
                    <span className="text-xs font-black uppercase">Data Original:</span>
                    <span className="text-xs font-bold">{aula.data_original ? aula.data_original.split('-').reverse().join('/') : 'Desconhecida'}</span>
                  </div>
                  {aula.motivo_cancelamento && (
                    <div className="pt-2 border-t-2 border-black/10 mt-2">
                      <span className="text-[10px] font-black uppercase text-[#8e7164] block mb-1">Motivo / Observação:</span>
                      <p className="text-xs font-bold text-black italic">"{aula.motivo_cancelamento}"</p>
                    </div>
                  )}
                </div>

                <div className="border-t-4 border-dashed border-[#ff6b00]/20 pt-4 mt-auto">
`;

code = code.replace(/<div className="flex items-center gap-3">[\s\S]*?<div className="border-t-4 border-dashed border-\[#ff6b00\]\/20 pt-4 mt-2">/m, newCode.trim());

// Also need to import format if we want, but split().reverse().join('/') is enough for YYYY-MM-DD

fs.writeFileSync('src/pages/Reposicoes.tsx', code);
console.log('Updated Reposicoes.tsx');
