const fs = require('fs');

let code = fs.readFileSync('src/pages/AlunoPerfil.tsx', 'utf8');

// 1. Remove state and handler from FinanceiroTab
const financeiroStateRegex = /const \[remanejarModal, setRemanejarModal\] = useState\(false\);\n  const \[novaDataInicio, setNovaDataInicio\] = useState\(''\);\n  \n  const handleRemanejarPagamentos = async \(\) => \{[\s\S]*?\};\n/g;

code = code.replace(financeiroStateRegex, '');

// 2. Remove the modal JSX from FinanceiroTab
const financeiroModalRegex = /\{\/\* Modal Remanejar Pagamentos \*\/\}\n\s*<AnimatePresence>[\s\S]*?<\/AnimatePresence>\n/g;
let financeiroModalMatch = code.match(financeiroModalRegex);
if(financeiroModalMatch) {
    code = code.replace(financeiroModalMatch[0], '');
}

// 3. Add state and handler to AlunoPerfil
const alunoPerfilStateRegex = /const \[showAgendaList, setShowAgendaList\] = useState\(false\);/;
const alunoPerfilStateAdd = `const [showAgendaList, setShowAgendaList] = useState(false);
  const [remanejarModal, setRemanejarModal] = useState(false);
  const [novaDataInicio, setNovaDataInicio] = useState('');
  
  const handleRemanejarPagamentos = async () => {
    if (!novaDataInicio) return;
    setSaving(true);
    try {
        const token = localStorage.getItem('acorde_token');
        await fetch(\`/api/alunos/\${id}/remanejar-pagamentos\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
            body: JSON.stringify({ nova_data_inicio: novaDataInicio })
        });
        setRemanejarModal(false);
        fetchData();
        toast.success('Pagamentos remanejados com sucesso!');
    } catch (e) {
        toast.error('Erro ao remanejar');
    } finally {
        setSaving(false);
    }
  };`;
code = code.replace(alunoPerfilStateRegex, alunoPerfilStateAdd);

// 4. Add the modal JSX to AlunoPerfil (end of the file)
const alunoPerfilModalRegex = /\{\/\* Modal Remanejar Aulas \*\/\}/;
const alunoPerfilModalAdd = `{/* Modal Remanejar Pagamentos */}
      <AnimatePresence>
        {remanejarModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-8 space-y-6">
              <div className="flex items-center justify-between border-b-2 border-black pb-4">
                <h2 className="text-xl font-black text-black uppercase italic">REMANEJAR PAGAMENTOS</h2>
                <button onClick={() => setRemanejarModal(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-[#8e7164] uppercase">Esta ação excluirá as faturas pendentes e recriará todas a partir da nova data.</p>
                <div>
                  <label className="text-[9px] font-black text-black uppercase block mb-1">Nova Data de Início</label>
                  <input type="date" value={novaDataInicio} onChange={e => setNovaDataInicio(e.target.value)} className="w-full bg-white border-4 border-black p-3 font-black text-sm outline-none" />
                </div>
              </div>
              <Button onClick={handleRemanejarPagamentos} disabled={saving} className="w-full">
                {saving ? 'REMANEJANDO...' : 'CONFIRMAR E REGERAR'}
              </Button>
            </Card>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Remanejar Aulas */}`;
code = code.replace(alunoPerfilModalRegex, alunoPerfilModalAdd);

// 5. Update FinanceiroTab props to receive the setRemanejarModal
const financeiroTabDefRegex = /function FinanceiroTab\(\{ financeiro, alunoId, onRefresh, total_parcelas \}: \{ financeiro: any\[\], alunoId: string, onRefresh: \(\) => void, total_parcelas\?: number \}\) \{/;
const financeiroTabDefAdd = `function FinanceiroTab({ financeiro, alunoId, onRefresh, total_parcelas, onOpenRemanejar }: { financeiro: any[], alunoId: string, onRefresh: () => void, total_parcelas?: number, onOpenRemanejar: () => void }) {`;
code = code.replace(financeiroTabDefRegex, financeiroTabDefAdd);

const financeiroTabBtnRegex = /<button \n\s*onClick=\{\(\) => setRemanejarModal\(true\)\}/;
const financeiroTabBtnAdd = `<button 
            onClick={() => onOpenRemanejar()}`;
code = code.replace(financeiroTabBtnRegex, financeiroTabBtnAdd);

// 6. Update AlunoPerfil render of FinanceiroTab
const financeiroTabRenderRegex = /<FinanceiroTab financeiro=\{financeiro\} alunoId=\{id!\} total_parcelas=\{aluno\?\.matriculas\?\.\[0\]\?\.total_parcelas\} onRefresh=\{\(\) => \{/;
const financeiroTabRenderAdd = `<FinanceiroTab financeiro={financeiro} alunoId={id!} total_parcelas={aluno?.matriculas?.[0]?.total_parcelas} onOpenRemanejar={() => setRemanejarModal(true)} onRefresh={() => {`;
code = code.replace(financeiroTabRenderRegex, financeiroTabRenderAdd);

fs.writeFileSync('src/pages/AlunoPerfil.tsx', code);
console.log("Scope fixed!");
