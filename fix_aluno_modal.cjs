const fs = require('fs');

let code = fs.readFileSync('src/components/alunos/AlunoModal.tsx', 'utf8');

const regex = /<div className="bg-white border border-black p-2">\s*<label className="block text-\[7px\] font-bold uppercase text-green-700">Valor c\/ Desconto \(R\$\)<\/label>\s*<input[^>]*value={formData.valor_com_desconto}[^>]*>\s*<\/div>\s*<\/div>/g;

const match = code.match(regex);
if (match) {
    const replacement = `
                        <div className="bg-white border border-black p-2">
                            <label className="block text-[7px] font-bold uppercase text-green-700">Valor c/ Desconto (R$)</label>
                            <input 
                                type="number" 
                                className="w-full bg-transparent border-none text-[10px] font-black outline-none" 
                                value={formData.valor_com_desconto}
                                onChange={(e) => setFormData({...formData, valor_com_desconto: e.target.value})}
                                placeholder="---"
                            />
                        </div>
                    </div>
                    <div className="mt-2 bg-white border border-black p-2">
                        <label className="block text-[7px] font-bold uppercase text-blue-700">Primeiro Pagamento</label>
                        <input 
                            type="date" 
                            className="w-full bg-transparent border-none text-[10px] font-black outline-none" 
                            value={formData.data_primeira_parcela}
                            onChange={(e) => {
                                setFormData({...formData, data_primeira_parcela: e.target.value, dia_vencimento: e.target.value.split('-')[2]});
                            }}
                        />
                        <p className="text-[6px] uppercase mt-1">O dia selecionado será o vencimento padrão.</p>
                    </div>`;
    code = code.replace(match[0], replacement);
    fs.writeFileSync('src/components/alunos/AlunoModal.tsx', code);
    console.log("AlunoModal.tsx fixed!");
} else {
    console.log("Could not find the target to replace in AlunoModal.tsx");
}
