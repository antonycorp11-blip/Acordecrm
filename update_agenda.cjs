const fs = require('fs');

let code = fs.readFileSync('src/pages/Agenda.tsx', 'utf8');

// Add state
code = code.replace("const [cancelModalAula, setCancelModalAula] = useState<any>(null);", "const [cancelModalAula, setCancelModalAula] = useState<any>(null);\n  const [motivoCancelamento, setMotivoCancelamento] = useState('');");

// Reset state when closing
code = code.replace(/setCancelModalAula\(null\)/g, "setCancelModalAula(null); setMotivoCancelamento('');");

// Pass motivo to API
code = code.replace(/body: JSON\.stringify\(\{ reposicao: true \}\)/g, "body: JSON.stringify({ reposicao: true, motivo_cancelamento: motivoCancelamento })");

// Add input to modal
const newModal = `
            <h3 className="text-xl font-black uppercase text-black mb-4">Cancelar Aula?</h3>
            <p className="text-xs font-bold text-black mb-4 uppercase">
              Deseja apenas cancelar esta aula ou enviá-la para a fila de reposições do aluno?
            </p>
            <div className="mb-6">
              <label className="block text-[10px] font-black text-black uppercase mb-2">Motivo / Observação (Opcional se for Falta):</label>
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
                    toast.error('Informe o motivo para enviar para reposição!');
                    return;
                  }
`;

code = code.replace(/<h3 className="text-xl font-black uppercase text-black mb-4">Cancelar Aula\?<\/h3>[\s\S]*?<div className="flex flex-col gap-3">\s*<button \s*onClick=\{\(\) => \{/m, newModal);

fs.writeFileSync('src/pages/Agenda.tsx', code);
console.log('Updated Agenda.tsx');
