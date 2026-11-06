const fs = require('fs');
let code = fs.readFileSync('src/pages/AlunoPerfil.tsx', 'utf8');

const regexAgendaState = /const \[showAgendaList, setShowAgendaList\] = useState\(false\);/;
const addAgendaState = `const [showAgendaList, setShowAgendaList] = useState(false);
  const [remanejarAulasModal, setRemanejarAulasModal] = useState(false);
  const [novaDataAulas, setNovaDataAulas] = useState('');
  
  const handleRemanejarAulas = async () => {
    if (!novaDataAulas) return;
    setSaving(true);
    try {
        const token = localStorage.getItem('acorde_token');
        await fetch(\`/api/alunos/\${id}/remanejar-aulas\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
            body: JSON.stringify({ nova_data_inicio: novaDataAulas })
        });
        setRemanejarAulasModal(false);
        fetchData();
        toast.success('Aulas remanejadas com sucesso!');
    } catch (e) {
        toast.error('Erro ao remanejar');
    } finally {
        setSaving(false);
    }
  };`;

code = code.replace(regexAgendaState, addAgendaState);

const regexAgendaHeader = /<h2 className="text-xl font-black text-black uppercase italic">Aulas do Aluno<\/h2>\n\s*<Button onClick=\{\(\) => setShowAgendaList\(!showAgendaList\)\} variant="dark">\n\s*\{showAgendaList \? 'VER CALENDÁRIOS' : 'VER LISTA TRADICIONAL'\}\n\s*<\/Button>/;
const addAgendaHeaderBtn = `<h2 className="text-xl font-black text-black uppercase italic">Aulas do Aluno</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setRemanejarAulasModal(true)}
                    className="bg-[#ff6b00] text-white px-4 py-2 text-[10px] font-black uppercase border-2 border-white shadow-[2px_2px_0_#fff] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    Remanejar Aulas
                  </button>
                  <Button onClick={() => setShowAgendaList(!showAgendaList)} variant="dark">
                    {showAgendaList ? 'VER CALENDÁRIOS' : 'VER LISTA TRADICIONAL'}
                  </Button>
                </div>`;

code = code.replace(regexAgendaHeader, addAgendaHeaderBtn);

const regexAgendaModal = /\{\/\* Modal Reagendamento \*\/\}/;

const addRemanejarAulasModal = `{/* Modal Remanejar Aulas */}
      <AnimatePresence>
        {remanejarAulasModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-8 space-y-6">
              <div className="flex items-center justify-between border-b-2 border-black pb-4">
                <h2 className="text-xl font-black text-black uppercase italic">REMANEJAR AULAS</h2>
                <button onClick={() => setRemanejarAulasModal(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-[#8e7164] uppercase">Esta ação excluirá as aulas pendentes atuais e recriará todas a partir da nova data escolhida, respeitando os intervalos de 7 dias e mudando o dia da semana atual se necessário.</p>
                <div>
                  <label className="text-[9px] font-black text-black uppercase block mb-1">Nova Data de Início</label>
                  <input type="date" value={novaDataAulas} onChange={e => setNovaDataAulas(e.target.value)} className="w-full bg-white border-4 border-black p-3 font-black text-sm outline-none" />
                </div>
              </div>
              <Button onClick={handleRemanejarAulas} disabled={saving} className="w-full">
                {saving ? 'REMANEJANDO...' : 'CONFIRMAR E REGERAR'}
              </Button>
            </Card>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Reagendamento */}`;

code = code.replace(regexAgendaModal, addRemanejarAulasModal);

fs.writeFileSync('src/pages/AlunoPerfil.tsx', code);
console.log("AlunoPerfil.tsx agenda patched!");
