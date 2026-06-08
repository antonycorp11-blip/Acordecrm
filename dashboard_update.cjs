const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Imports
code = code.replace("import { useAuth } from '../contexts/AuthContext';", "import { useAuth } from '../contexts/AuthContext';\nimport { toast } from 'sonner';");

// States and Logic
const logicStart = `
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
`;
const logicEnd = `
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  const [aulasSemStatus, setAulasSemStatus] = useState<any[]>([]);
  const [faturasPendentes, setFaturasPendentes] = useState<any[]>([]);
  const [showModalAulas, setShowModalAulas] = useState(false);
  const [showModalFaturas, setShowModalFaturas] = useState(false);
  const [cancelModalAula, setCancelModalAula] = useState<any>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  const getQuintoDiaUtil = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth();
    let count = 0;
    let day = 1;
    while (count < 5) {
      const temp = new Date(year, month, day);
      const w = temp.getDay();
      if (w !== 0 && w !== 6) count++;
      if (count < 5) day++;
    }
    return new Date(year, month, day);
  };

  const loadAlerts = () => {
    const token = localStorage.getItem('acorde_token');
    const headers = { Authorization: \`Bearer \${token}\` };

    Promise.all([
      fetch('/api/agenda/pendentes-passado', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/dashboard/faturas-pendentes', { headers }).then(r => r.ok ? r.json() : [])
    ]).then(([aulas, faturas]) => {
      setAulasSemStatus(aulas);
      setFaturasPendentes(faturas);
      
      const quintoDia = getQuintoDiaUtil();
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      quintoDia.setHours(0,0,0,0);

      // Regra dos modais: Apenas se for maior que zero
      if (aulas.length > 0) setShowModalAulas(true);
      // Faturas apenas a partir do quinto dia útil
      if (faturas.length > 0 && hoje >= quintoDia) setShowModalFaturas(true);
    }).catch(console.error);
  };
`;
code = code.replace(logicStart.trim(), logicEnd.trim());

// Insert loadAlerts inside useEffect
code = code.replace("  useEffect(() => {\n    if (window.innerWidth < 768) {", "  useEffect(() => {\n    loadAlerts();\n    if (window.innerWidth < 768) {");

// Widgets UI
const widgetsUI = `
        {/* MIDDLE ROW: ALERTAS E RESOLUÇÕES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* AULAS SEM STATUS WIDGET */}
          <div className="sticker-card rounded-lg flex flex-col overflow-hidden" style={{ background: '#fff8f6', border: '3px solid #261812', maxHeight: '350px' }}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: '#ffeb3b', borderBottom: '3px solid #261812' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-black" />
                <p className="text-black text-[11px] font-black uppercase tracking-widest">Aulas Pendentes ({aulasSemStatus.length})</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {aulasSemStatus.length > 0 ? aulasSemStatus.map(aula => (
                <div key={aula.id} className="bg-white p-3 border-2 border-black rounded shadow-[2px_2px_0_#000]">
                  <p className="font-black text-black uppercase text-xs">{aula.alunos?.nome}</p>
                  <p className="text-[9px] font-bold text-[#8e7164] uppercase mb-2">
                    {aula.data.split('-').reverse().join('/')} às {aula.horario} - Prof. {aula.professores?.nome}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => {
                        if (confirm('Marcar Presença? Isso creditará o saldo do professor.')) {
                          fetch(\`/api/aulas/\${aula.id}/status\`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('acorde_token')}\` },
                            body: JSON.stringify({ status: 'realizada', type: 'reg' })
                          }).then(() => { toast.success('Presença marcada!'); loadAlerts(); });
                        }
                      }}
                      className="px-2 py-1 bg-green-500 text-black border-2 border-black font-black text-[9px] uppercase active:translate-y-1 shadow-[1px_1px_0_#000] active:shadow-none"
                    >✅ Pre.</button>
                    <button 
                      onClick={() => {
                        if (confirm('Marcar Falta (Não paga)? A aula sairá da agenda.')) {
                          fetch(\`/api/agenda/\${aula.id}/cancelar\`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('acorde_token')}\` },
                            body: JSON.stringify({ reposicao: false })
                          }).then(() => { toast.success('Marcado como falta!'); loadAlerts(); });
                        }
                      }}
                      className="px-2 py-1 bg-red-500 text-white border-2 border-black font-black text-[9px] uppercase active:translate-y-1 shadow-[1px_1px_0_#000] active:shadow-none"
                    >❌ Falta</button>
                    <button 
                      onClick={() => setCancelModalAula(aula)}
                      className="px-2 py-1 bg-[#ffeb3b] text-black border-2 border-black font-black text-[9px] uppercase active:translate-y-1 shadow-[1px_1px_0_#000] active:shadow-none"
                    >🔄 Rep.</button>
                  </div>
                </div>
              )) : (
                <div className="h-full flex items-center justify-center text-[#8e7164] text-xs font-black uppercase text-center">Tudo limpo! Nenhuma aula atrasada.</div>
              )}
            </div>
          </div>

          {/* FATURAS WIDGET */}
          <div className="sticker-card rounded-lg flex flex-col overflow-hidden" style={{ background: '#fff8f6', border: '3px solid #261812', maxHeight: '350px' }}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: '#ff6b00', borderBottom: '3px solid #261812' }}>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-sm">💰</span>
                <p className="text-white text-[11px] font-black uppercase tracking-widest">Cobranças do Mês ({faturasPendentes.length})</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {faturasPendentes.length > 0 ? faturasPendentes.map(fat => (
                <div key={fat.id} className="flex items-center justify-between bg-white p-3 border-2 border-black rounded shadow-[2px_2px_0_#000]">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-black uppercase text-xs truncate">{fat.alunos?.nome}</p>
                    <p className="text-[9px] font-bold text-[#8e7164] uppercase">Vence: {fat.data_vencimento.split('-').reverse().join('/')}</p>
                  </div>
                  <div className="shrink-0 text-right ml-2">
                    <p className="font-black text-red-600 text-sm">R$ {fat.valor}</p>
                    <p className="text-[8px] font-black uppercase bg-red-100 text-red-800 px-1 rounded border border-red-300 inline-block">{fat.status}</p>
                  </div>
                </div>
              )) : (
                <div className="h-full flex items-center justify-center text-[#8e7164] text-xs font-black uppercase text-center">Nenhuma cobrança pendente.</div>
              )}
            </div>
          </div>
        </div>
`;

code = code.replace("{/* BOTTOM ROW */}", widgetsUI.trim() + "\n\n        {/* BOTTOM ROW */}");

// Modals
const modals = `
      {/* POPUPS DE AVISO (STARTUP) */}
      {showModalAulas && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[#ffeb3b] border-4 border-black p-6 w-full max-w-sm font-['Space_Mono'] shadow-[8px_8px_0_#000] relative">
            <div className="w-12 h-12 bg-black text-[#ffeb3b] rounded-full flex items-center justify-center absolute -top-6 -left-6 border-4 border-black shadow-[4px_4px_0_#000]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase text-black mb-4 mt-2">Atenção!</h3>
            <p className="text-sm font-bold text-black mb-6 uppercase">
              Existem {aulasSemStatus.length} aulas no passado que não tiveram presença ou falta registradas. Por favor, resolva no painel da tela inicial.
            </p>
            <button 
              onClick={() => setShowModalAulas(false)}
              className="w-full px-4 py-3 bg-black text-[#ffeb3b] border-4 border-black font-black uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none hover:bg-[#333]"
            >
              Ciente
            </button>
          </div>
        </div>
      )}

      {!showModalAulas && showModalFaturas && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[#ff6b00] border-4 border-black p-6 w-full max-w-sm font-['Space_Mono'] shadow-[8px_8px_0_#000] relative">
            <div className="w-12 h-12 bg-black text-[#ff6b00] rounded-full flex items-center justify-center absolute -top-6 -left-6 border-4 border-black shadow-[4px_4px_0_#000]">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase text-white mb-4 mt-2">Cobranças Pendentes</h3>
            <p className="text-sm font-bold text-white mb-6 uppercase">
              Lembrete: Hoje já é do quinto dia útil em diante! Existem {faturasPendentes.length} alunos com mensalidade pendente ou próxima. Não se esqueça de cobrar!
            </p>
            <button 
              onClick={() => setShowModalFaturas(false)}
              className="w-full px-4 py-3 bg-white text-black border-4 border-black font-black uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none hover:bg-gray-200"
            >
              Ciente
            </button>
          </div>
        </div>
      )}

      {/* CANCEL/REPOSICAO MODAL (REUSED FROM AGENDA) */}
      {cancelModalAula && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black p-6 w-full max-w-sm font-['Space_Mono'] shadow-[8px_8px_0_#000]">
            <h3 className="text-xl font-black uppercase text-black mb-4">Reposição?</h3>
            <p className="text-xs font-bold text-black mb-4 uppercase">
              Deseja enviar esta aula para a fila de reposições do aluno?
            </p>
            <div className="mb-6">
              <label className="block text-[10px] font-black text-black uppercase mb-2">Motivo / Observação:</label>
              <textarea 
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Professor faltou, Atestado Médico..."
                className="w-full bg-[#f4f4f5] border-2 border-black p-3 text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-[#ff6b00]"
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (!motivoCancelamento.trim()) {
                    toast.error('Informe o motivo!');
                    return;
                  }
                  fetch(\`/api/agenda/\${cancelModalAula.id}/cancelar\`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('acorde_token')}\` },
                    body: JSON.stringify({ reposicao: true, motivo_cancelamento: motivoCancelamento })
                  }).then(() => {
                    toast.success('Enviada para reposição!');
                    loadAlerts();
                    setCancelModalAula(null);
                    setMotivoCancelamento('');
                  });
                }}
                className="w-full px-4 py-3 bg-green-500 text-black border-4 border-black font-black uppercase shadow-[4px_4px_0_#000] active:translate-y-1 hover:bg-green-400"
              >
                SIM (Reposição)
              </button>
              <button 
                onClick={() => { setCancelModalAula(null); setMotivoCancelamento(''); }}
                className="w-full mt-4 text-[#8e7164] font-bold text-sm uppercase hover:text-black"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace("    </div>\n  );\n}", modals.trim() + "\n    </div>\n  );\n}");

fs.writeFileSync('src/pages/Dashboard.tsx', code);
console.log('Updated Dashboard.tsx with widgets and modals');
