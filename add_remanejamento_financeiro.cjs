const fs = require('fs');
let code = fs.readFileSync('src/pages/AlunoPerfil.tsx', 'utf8');

const regexFinanceiroState = /const \[baixaModal, setBaixaModal\] = useState[^>]*;\n  const \[baixaMetodo, setBaixaMetodo\] = useState\('pix'\);\n  const \[valorFinal, setValorFinal\] = useState\(0\);/;

const addStates = `const [baixaModal, setBaixaModal] = useState<{ id: number | null, open: boolean, valor: number, valor_desconto?: number, vencimento: string }>({ id: null, open: false, valor: 0, vencimento: '' });
  const [baixaMetodo, setBaixaMetodo] = useState('pix');
  const [valorFinal, setValorFinal] = useState(0);
  const [remanejarModal, setRemanejarModal] = useState(false);
  const [novaDataInicio, setNovaDataInicio] = useState('');
  
  const handleRemanejarPagamentos = async () => {
    if (!novaDataInicio) return;
    setSaving(true);
    try {
        const token = localStorage.getItem('acorde_token');
        await fetch(\`/api/alunos/\${alunoId}/remanejar-pagamentos\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
            body: JSON.stringify({ nova_data_inicio: novaDataInicio })
        });
        setRemanejarModal(false);
        onRefresh();
        toast.success('Pagamentos remanejados com sucesso!');
    } catch (e) {
        toast.error('Erro ao remanejar');
    } finally {
        setSaving(false);
    }
  };`;

code = code.replace(regexFinanceiroState, addStates);

const regexFinanceiroHeader = /<div className="p-4 border-b-4 border-black bg-black flex items-center justify-between">\n\s*<h3 className="font-black text-white uppercase text-\[10px\] tracking-widest">Extrato de Faturas<\/h3>\n\s*<Badge color="bege">\{pendentes\.length\} PENDENTES<\/Badge>\n\s*<\/div>/;

const addHeaderBtn = `<div className="p-4 border-b-4 border-black bg-black flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="font-black text-white uppercase text-[10px] tracking-widest">Extrato de Faturas</h3>
            <Badge color="bege">{pendentes.length} PENDENTES</Badge>
          </div>
          <button 
            onClick={() => setRemanejarModal(true)}
            className="bg-[#ff6b00] text-white px-4 py-2 text-[10px] font-black uppercase border-2 border-white shadow-[2px_2px_0_#fff] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            Remanejar Pagamentos Pendentes
          </button>
        </div>`;

code = code.replace(regexFinanceiroHeader, addHeaderBtn);

const regexFinanceiroModal = /\{\/\* Modal Baixa \*\/\}/;

const addRemanejarModal = `{/* Modal Remanejar Pagamentos */}
      <AnimatePresence>
        {remanejarModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-8 space-y-6">
              <div className="flex items-center justify-between border-b-2 border-black pb-4">
                <h2 className="text-xl font-black text-black uppercase italic">REMANEJAR</h2>
                <button onClick={() => setRemanejarModal(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-[#8e7164] uppercase">Esta ação excluirá as {pendentes.length} faturas pendentes atuais e recriará todas a partir da nova data escolhida.</p>
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

      {/* Modal Baixa */}`;

code = code.replace(regexFinanceiroModal, addRemanejarModal);

fs.writeFileSync('src/pages/AlunoPerfil.tsx', code);
console.log("AlunoPerfil.tsx financeiro patched!");
