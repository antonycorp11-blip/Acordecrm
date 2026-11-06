const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

// Add valor_pago to select
code = code.replace(".select('valor, status, tipo_receita, matricula_id, aluno:aluno_id!inner(status, matriculas(id, status, valor_com_desconto, valor_parcela))')", ".select('valor, valor_pago, status, tipo_receita, matricula_id, aluno:aluno_id!inner(status, matriculas(id, status, valor_com_desconto, valor_parcela))')");

// Fix TS error on loop
const loopOld = `                for (const p of pags) {
                    let valorEfetivo = Number(p.valor);`;

const loopNew = `                for (const item of pags) {
                    const p: any = item;
                    let valorEfetivo = Number(p.valor);`;

code = code.replace(loopOld, loopNew);

const ifOld = `                    if (p.status === 'pago') {
                        const vp = p.valor_pago != null ? Number(p.valor_pago) : Number(p.valor);
                        receitaMes += vp;
                    } else {
                        pendentes += valorEfetivo;
                    }
                    faturamentoPrevisto += (p.status === 'pago' ? vp : valorEfetivo);`;

const ifNew = `                    let vp = p.valor_pago != null ? Number(p.valor_pago) : Number(p.valor);
                    if (p.status === 'pago') {
                        receitaMes += vp;
                    } else {
                        pendentes += valorEfetivo;
                    }
                    faturamentoPrevisto += (p.status === 'pago' ? vp : valorEfetivo);`;

code = code.replace(ifOld, ifNew);

fs.writeFileSync('api/index.ts', code);
console.log('Fixed API TS error');
