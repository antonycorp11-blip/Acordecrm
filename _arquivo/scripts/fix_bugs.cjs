const fs = require('fs');

// 1. Fix api/index.ts
let apiCode = fs.readFileSync('api/index.ts', 'utf8');

apiCode = apiCode.replace(
  /valor_parcela, valor_com_desconto\n\s*\} = req.body;/,
  `valor_parcela, valor_com_desconto, dia_vencimento\n            } = req.body;`
);

apiCode = apiCode.replace(
  /if \(valor_com_desconto !== undefined && valor_com_desconto !== ''\) matUpdate.valor_com_desconto = Number\(valor_com_desconto\);/,
  `if (valor_com_desconto !== undefined && valor_com_desconto !== '') matUpdate.valor_com_desconto = Number(valor_com_desconto);\n            if (dia_vencimento !== undefined && dia_vencimento !== '') matUpdate.dia_vencimento = Number(dia_vencimento);`
);

const oldPagamentosLogic = `// Atualizar pagamentos pendentes
                    if (matUpdate.valor_parcela !== undefined) {
                        const { error: pagError } = await supabase
                            .from('pagamentos')
                            .update({ valor: matUpdate.valor_parcela })
                            .eq('aluno_id', studentId)
                            .eq('status', 'pendente')
                            .eq('tipo_receita', 'mensalidade');
                            
                        if (pagError) {
                            console.error('[PAGAMENTOS_UPDATE_ERROR]:', pagError);
                        } else {
                            console.log(\`[PAGAMENTOS_UPDATE] Pagamentos pendentes atualizados para \${matUpdate.valor_parcela}.\`);
                        }
                    }`;

const newPagamentosLogic = `// Atualizar pagamentos pendentes
                    if (matUpdate.valor_parcela !== undefined || matUpdate.dia_vencimento !== undefined) {
                        const { data: pendentes } = await supabase
                            .from('pagamentos')
                            .select('id, data_vencimento')
                            .eq('aluno_id', studentId)
                            .eq('status', 'pendente')
                            .eq('tipo_receita', 'mensalidade');

                        if (pendentes && pendentes.length > 0) {
                            for (const pg of pendentes) {
                                const updatePg = {};
                                if (matUpdate.valor_parcela !== undefined) updatePg.valor = matUpdate.valor_parcela;
                                if (matUpdate.dia_vencimento !== undefined && pg.data_vencimento) {
                                    const parts = pg.data_vencimento.split('-');
                                    if (parts.length === 3) {
                                        parts[2] = matUpdate.dia_vencimento.toString().padStart(2, '0');
                                        updatePg.data_vencimento = parts.join('-');
                                    }
                                }
                                await supabase.from('pagamentos').update(updatePg).eq('id', pg.id);
                            }
                            console.log('[PAGAMENTOS_UPDATE] Pagamentos pendentes atualizados.');
                        }
                    }`;

apiCode = apiCode.replace(oldPagamentosLogic, newPagamentosLogic);
fs.writeFileSync('api/index.ts', apiCode);

// 2. Fix GeradorContrato.tsx
let geradorCode = fs.readFileSync('src/components/GeradorContrato.tsx', 'utf8');

const hookToAdd = `
  useEffect(() => {
    if (isOpen && aluno) {
      setNovoResponsavel(aluno.responsavel_nome || "");
      setNovoCpf(aluno.responsavel_cpf || aluno.cpf || "");
      setNovoEndereco(aluno.endereco || "");
      setNovoEmail(aluno.email || "");
      
      const matricula = aluno.matriculas?.[0];
      setValorPlano(matricula?.valor_parcela?.toString() || "370");
      setQtdParcelas(matricula?.total_parcelas?.toString() || "6");
      setDiaVencimento(matricula?.dia_vencimento?.toString() || "10");
      setCursoNome(matricula?.cursos?.nome || "Música");
    }
  }, [isOpen, aluno]);
`;

geradorCode = geradorCode.replace(
  /useEffect\(\(\) => \{\n\s*fetchTemplate\(\);\n\s*\}, \[\]\);/,
  `useEffect(() => {\n    fetchTemplate();\n  }, []);\n${hookToAdd}`
);

fs.writeFileSync('src/components/GeradorContrato.tsx', geradorCode);
console.log('Fixed scripts!');
