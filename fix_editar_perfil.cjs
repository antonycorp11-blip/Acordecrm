const fs = require('fs');

let code = fs.readFileSync('src/pages/AlunoPerfil.tsx', 'utf8');

const regexModal = /<div className="md:col-span-2 flex flex-col gap-2 mt-4">/;

const addition = `<div className="md:col-span-2 p-4 mt-6 border-4 border-black bg-[#ff6b00]">
                       <h3 className="text-white font-black uppercase text-lg italic mb-2 tracking-widest">Remanejamento de Datas</h3>
                       <p className="text-white text-[10px] font-bold uppercase mb-4">Use os botões abaixo se precisar empurrar as aulas pendentes ou os pagamentos pendentes para começar em uma nova data.</p>
                       <div className="flex flex-col sm:flex-row gap-4">
                         <button 
                           onClick={(e) => { e.preventDefault(); setIsEditModalOpen(false); setActiveTab('financeiro'); setRemanejarModal(true); }}
                           className="flex-1 bg-black text-white p-3 font-black uppercase text-xs border-2 border-white shadow-[4px_4px_0_#fff] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                         >
                           Remanejar Pagamentos
                         </button>
                         <button 
                           onClick={(e) => { e.preventDefault(); setIsEditModalOpen(false); setActiveTab('agenda'); setRemanejarAulasModal(true); }}
                           className="flex-1 bg-white text-black p-3 font-black uppercase text-xs border-2 border-black shadow-[4px_4px_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                         >
                           Remanejar Aulas
                         </button>
                       </div>
                    </div>
                    
                    <div className="md:col-span-2 flex flex-col gap-2 mt-4">`;

code = code.replace(regexModal, addition);

fs.writeFileSync('src/pages/AlunoPerfil.tsx', code);
console.log("Added remanejamento buttons inside Edit Modal");
