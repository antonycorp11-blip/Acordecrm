const fs = require('fs');
let code = fs.readFileSync('src/pages/Agenda.tsx', 'utf8');

const uiComponent = `
      {/* CENTRO DE RESOLUÇÕES - AULAS SEM STATUS NO PASSADO */}
      {aulasSemStatus.length > 0 && (
        <div className="bg-[#ffeb3b] border-b-4 border-[#261812] shrink-0">
          <div className="px-6 py-2 flex items-center justify-between cursor-pointer hover:bg-[#fbc02d] transition-colors" onClick={() => setShowAulasSemStatus(!showAulasSemStatus)}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-black" />
              <span className="text-black font-black uppercase text-sm">Atenção: {aulasSemStatus.length} aula(s) do passado sem status!</span>
            </div>
            <button className="text-[10px] font-black uppercase bg-black text-[#ffeb3b] px-3 py-1 border-2 border-black hover:bg-[#333]">
              {showAulasSemStatus ? 'OCULTAR' : 'RESOLVER AGORA'}
            </button>
          </div>
          
          {showAulasSemStatus && (
            <div className="p-4 bg-white border-t-4 border-[#261812] max-h-60 overflow-y-auto">
              <p className="text-xs font-bold text-[#8e7164] mb-4 uppercase">
                Estas aulas já passaram, mas o professor não marcou presença nem falta no diário. Resolva-as para não afetar os pagamentos e relatórios.
              </p>
              <div className="flex flex-col gap-3">
                {aulasSemStatus.map((aula) => (
                  <div key={aula.id} className="flex flex-col md:flex-row md:items-center justify-between bg-[#fff8f6] p-3 border-2 border-[#261812] shadow-[3px_3px_0_#000]">
                    <div className="mb-3 md:mb-0">
                      <p className="font-black text-black uppercase text-sm">{aula.alunos?.nome}</p>
                      <p className="text-[10px] font-bold text-[#8e7164] uppercase">
                        {aula.data.split('-').reverse().join('/')} às {aula.horario} - Prof. {aula.professores?.nome}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        onClick={() => {
                          if (confirm('Marcar Presença? Isso creditará o saldo do professor.')) {
                            fetch(\`/api/aulas/\${aula.id}/status\`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('acorde_token')}\` },
                              body: JSON.stringify({ status: 'realizada', type: 'reg' })
                            }).then(() => { toast.success('Presença marcada!'); fetchAulas(); });
                          }
                        }}
                        className="px-3 py-2 bg-green-500 text-black border-2 border-black font-black text-[10px] uppercase hover:bg-green-400 active:translate-y-1 shadow-[2px_2px_0_#000] active:shadow-none"
                      >
                        ✅ Presença
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Marcar Falta (Não paga)? A aula sairá da agenda.')) {
                            fetch(\`/api/agenda/\${aula.id}/cancelar\`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('acorde_token')}\` },
                              body: JSON.stringify({ reposicao: false })
                            }).then(() => { toast.success('Marcado como falta!'); fetchAulas(); });
                          }
                        }}
                        className="px-3 py-2 bg-red-500 text-white border-2 border-black font-black text-[10px] uppercase hover:bg-red-400 active:translate-y-1 shadow-[2px_2px_0_#000] active:shadow-none"
                      >
                        ❌ Falta
                      </button>
                      <button 
                        onClick={() => {
                          setCancelModalAula(aula);
                          setShowAulasSemStatus(false);
                        }}
                        className="px-3 py-2 bg-[#ffeb3b] text-black border-2 border-black font-black text-[10px] uppercase hover:bg-[#fbc02d] active:translate-y-1 shadow-[2px_2px_0_#000] active:shadow-none"
                      >
                        🔄 Reposição...
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CALENDAR CONTAINER */}
`;

code = code.replace("{/* CALENDAR CONTAINER */}", uiComponent.trim());

fs.writeFileSync('src/pages/Agenda.tsx', code);
console.log('Added AulasSemStatus UI to Agenda.tsx');
