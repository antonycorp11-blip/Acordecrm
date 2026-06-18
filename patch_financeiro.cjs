const fs = require('fs');
const path = './src/pages/Financeiro.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Remove 'despesas' and 'dre' from activeTab state
code = code.replace(
  /const \[activeTab, setActiveTab\] = useState\<'receitas' \| 'despesas' \| 'professores' \| 'dre'\>\('receitas'\);/g,
  "const [activeTab, setActiveTab] = useState<'receitas' | 'despesas' | 'professores'>('receitas');"
);

// 2. Remove the header buttons for dre
code = code.replace(
  /<button onClick=\{\(\) => setActiveTab\('dre'\)\}.*?<\/button>/,
  ""
);

// 3. Update the summary cards to the new DRE Dashboard
const oldSummaryCardsRegex = /\{\/\* Summary Cards \*\/\}.*?(?=\{\/\* Action & Filter Bar Emusys Style \*\/\})/s;
const newDashboardHTML = `
      {/* NOVO DASHBOARD DRE FINANCEIRO */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#00FF41] border-4 border-black p-4 shadow-hard-black relative overflow-hidden group text-black flex flex-col justify-between min-h-[140px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 rotate-12 translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 z-10">Previsão Receitas</p>
            <div className="z-10">
              <h3 className="text-3xl font-black">R$ {(resumo?.faturamentoPrevisto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              <p className="text-xs font-bold mt-1 opacity-80">Realizado: R$ {(resumo?.receitaMes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="bg-[#FF0000] border-4 border-black p-4 shadow-hard-black relative overflow-hidden group text-white flex flex-col justify-between min-h-[140px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rotate-12 translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 z-10">Previsão Despesas</p>
            <div className="z-10">
              <h3 className="text-3xl font-black">R$ {(resumo?.despesasTotalPrevistas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              <p className="text-xs font-bold mt-1 opacity-80">Pagas: R$ {(resumo?.despesasPagas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="bg-[#FF8A00] border-4 border-black p-4 shadow-hard-black relative overflow-hidden group text-black flex flex-col justify-between min-h-[140px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rotate-12 translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 z-10">Salários Previstos</p>
            <div className="z-10">
              <h3 className="text-3xl font-black">R$ {(resumo?.salariosPrevistos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              <p className="text-xs font-bold mt-1 opacity-80">
                Representa {(resumo?.faturamentoPrevisto > 0 ? ((resumo.salariosPrevistos / resumo.faturamentoPrevisto) * 100) : 0).toFixed(1)}% das Receitas
              </p>
            </div>
          </div>

          <div className="bg-white border-4 border-black p-4 shadow-hard-black relative overflow-hidden group text-black flex flex-col justify-between min-h-[140px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 -rotate-12 translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 z-10">Saldo Líquido (Previsto)</p>
            <div className="z-10">
              <h3 className="text-3xl font-black">R$ {(resumo?.lucroPrevisto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              <p className="text-xs font-bold mt-1 text-slate-600">Margem: {(resumo?.margemLucroPrevisto || 0).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* CUSTOS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div className="border-2 border-white/20 p-3 bg-white/5 relative">
             <p className="text-[9px] font-black uppercase text-[#FF8A00] mb-1">Custo Estrutural</p>
             <p className="text-xs text-white opacity-60">Despesas Fixas</p>
             <h4 className="text-lg font-bold text-white mt-2">R$ {(resumo?.custos?.estrutural || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          </div>
          <div className="border-2 border-white/20 p-3 bg-white/5 relative">
             <p className="text-[9px] font-black uppercase text-[#FF8A00] mb-1">Custo Variável</p>
             <p className="text-xs text-white opacity-60">Parcelas/Dívidas</p>
             <h4 className="text-lg font-bold text-white mt-2">R$ {(resumo?.custos?.variavel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          </div>
          <div className="border-2 border-white/20 p-3 bg-white/5 relative">
             <p className="text-[9px] font-black uppercase text-[#FF8A00] mb-1">Custo Operacional</p>
             <p className="text-xs text-white opacity-60">Salários</p>
             <h4 className="text-lg font-bold text-white mt-2">R$ {(resumo?.custos?.operacional || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          </div>
          <div className="border-2 border-white/20 p-3 bg-white/5 relative">
             <p className="text-[9px] font-black uppercase text-[#FF8A00] mb-1">Custo Fiscal</p>
             <p className="text-xs text-white opacity-60">Impostos</p>
             <h4 className="text-lg font-bold text-white mt-2">R$ {(resumo?.custos?.fiscal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          </div>
        </div>
      </div>

      {activeTab === 'receitas' ? (
        <div className="bg-[#1A1A1A] border-4 border-white p-6 shadow-hard flex flex-col gap-6">
`;

code = code.replace(oldSummaryCardsRegex, newDashboardHTML);

// 4. Update the red highlight for the last installment
const trRenderRegex = /<tr key=\{.*?\} className="hover:bg-white\/5 transition-colors group">/s;
const newTrRender = `<tr key={\`\${p.id}-\${idx}\`} className={\`\${p.is_ultima_parcela ? 'bg-[#FF0000]/20 hover:bg-[#FF0000]/30 border-2 border-[#FF0000]' : 'hover:bg-white/5'} transition-colors group\`}>`;

code = code.replace(trRenderRegex, newTrRender);

// Insert the alert inside the TD for Vencimento or Situação
const situacaoTdRegex = /<td className="px-4 py-5">\s*\{p\.status === 'pago' \?/s;
const newSituacaoTd = `<td className="px-4 py-5">
                      {p.is_ultima_parcela && <div className="text-[9px] font-black text-[#FF0000] bg-[#FF0000]/10 px-2 py-0.5 border border-[#FF0000] mb-2 uppercase inline-block">Última Parcela</div>}
                      <br/>
                      {p.status === 'pago' ?`;

code = code.replace(situacaoTdRegex, newSituacaoTd);

// 5. Update category options to include "imposto"
code = code.replace(
  /<option value="divida">Dívida<\/option>/,
  '<option value="divida">Dívida</option><option value="imposto">Imposto</option>'
);

// 6. Ensure the "Despesas" list tab is working properly with the "Nova Despesa" button inside it.
// The code already renders the Despesas tab when activeTab === 'despesas'.
// We just need to remove the rendering of dre tab.

const dreRenderRegex = /\} : activeTab === 'dre' \? \([\s\S]*?\}\)/;
code = code.replace(dreRenderRegex, "}");

// Also remove dre check in dre tab rendering just in case.
const dreRenderRegex2 = /\} : activeTab === 'dre' \? \([\s\S]*?\)\s*:\s*null\}/;
code = code.replace(dreRenderRegex2, "} : null}");

fs.writeFileSync(path, code);
console.log('Financeiro.tsx patched successfully');
