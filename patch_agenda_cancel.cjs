const fs = require('fs');
let code = fs.readFileSync('src/pages/Agenda.tsx', 'utf8');

// 1. Add state for Cancel Modal
if (!code.includes("const [cancelModalAula, setCancelModalAula] = useState")) {
    code = code.replace(
        "const [selectedAula, setSelectedAula] = useState<any | null>(null);", 
        "const [selectedAula, setSelectedAula] = useState<any | null>(null);\n  const [cancelModalAula, setCancelModalAula] = useState<any | null>(null);"
    );
}

// 2. Change the cancel button to open the modal instead of window.confirm
const oldCancelBtn = `if (window.confirm('Tem certeza que deseja cancelar e desmarcar esta aula?')) {
                                     fetch(\`/api/agenda/\${aula.id}\`, { 
                                       method: 'DELETE',
                                       headers: { 'Authorization': \`Bearer \${localStorage.getItem('acorde_token')}\` }
                                     }).then(() => {
                                       toast.success('Aula cancelada e removida da agenda.');
                                       fetchAulas();
                                       setSelectedAula(null);
                                     });
                                   }`;

const newCancelBtn = `setCancelModalAula(aula);
                                   setSelectedAula(null);`;

code = code.replace(oldCancelBtn, newCancelBtn);

// 3. Render the Cancel Modal at the bottom of Agenda.tsx
const cancelModalJSX = `
      {/* CANCEL MODAL */}
      {cancelModalAula && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#1a0f0a] border-4 border-[#3d2d26] p-6 max-w-sm w-full flex flex-col gap-4">
            <h3 className="text-xl font-black text-[#ff6b00] uppercase text-center">Cancelar Aula</h3>
            <p className="text-white text-sm text-center">O aluno terá direito a reposição desta aula?</p>
            <div className="flex flex-col gap-2 mt-4">
              <button 
                onClick={() => {
                  fetch(\`/api/agenda/\${cancelModalAula.id}/cancelar\`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('acorde_token')}\` },
                    body: JSON.stringify({ reposicao: true })
                  }).then(() => {
                    toast.success('Aula enviada para a fila de reposição.');
                    fetchAulas();
                    setCancelModalAula(null);
                  });
                }}
                className="w-full px-4 py-3 bg-green-500 text-black border-4 border-black font-black uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none hover:bg-green-400"
              >
                SIM (Mover para Reposição)
              </button>
              <button 
                onClick={() => {
                  fetch(\`/api/agenda/\${cancelModalAula.id}/cancelar\`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('acorde_token')}\` },
                    body: JSON.stringify({ reposicao: false })
                  }).then(() => {
                    toast.success('Aula cancelada (Registrada como Falta).');
                    fetchAulas();
                    setCancelModalAula(null);
                  });
                }}
                className="w-full px-4 py-3 bg-red-500 text-white border-4 border-black font-black uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none hover:bg-red-400"
              >
                NÃO (Registrar como Falta)
              </button>
              <button 
                onClick={() => setCancelModalAula(null)}
                className="w-full mt-4 text-[#8e7164] font-bold text-sm uppercase hover:text-white"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
`;

if (!code.includes("CANCEL MODAL")) {
    code = code.replace("    </div>\n  );\n}", cancelModalJSX + "\n    </div>\n  );\n}");
}

fs.writeFileSync('src/pages/Agenda.tsx', code, 'utf8');
console.log('Cancel Modal injected');
