const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function parseAllPdfs() {
    const pdfDir = path.join(__dirname, '../pdfs_faturas');
    if (!fs.existsSync(pdfDir)) {
        console.log('Pasta pdfs_faturas nao encontrada.');
        return;
    }
    
    const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));
    console.log(`Encontrados ${files.length} PDFs para processar.`);
    
    for (let file of files) {
        const pdfPath = path.join(pdfDir, file);
        // Use pdf2json to extract text
        try {
            console.log(`\nProcessando ${file}...`);
            const txtPath = pdfPath.replace('.pdf', '.content.txt');
            execSync(`npx pdf2json -f "${pdfPath}" -c -s`, { stdio: 'ignore' });
            
            if (fs.existsSync(txtPath)) {
                const text = fs.readFileSync(txtPath, 'utf8');
                await processPdfText(text);
                // clean up txt file if needed
                // fs.unlinkSync(txtPath);
            }
        } catch (e) {
            console.error(`Erro ao processar ${file}:`, e.message);
        }
    }
}

async function processPdfText(text) {
    // Ficha Financeira - SULISMAIK DE SOUZA - Todas as Matrículas
    const nameMatch = text.match(/Ficha Financeira - (.*?) -/);
    if (!nameMatch) {
        console.log('Não foi possível encontrar o nome do aluno no texto.');
        return;
    }
    
    let alunoNome = nameMatch[1].trim();
    console.log(`Aluno encontrado no PDF: ${alunoNome}`);
    
    // Find aluno in DB
    const { data: alunos } = await supabase.from('alunos').select('id, nome');
    // case insensitive match
    const aluno = alunos.find(a => a.nome.toUpperCase() === alunoNome.toUpperCase());
    if (!aluno) {
        console.log(`⚠ Aluno '${alunoNome}' não encontrado no banco de dados!`);
        return;
    }
    
    // Extract paid invoices
    // Matches something like: 01/04/2026 28/03/2026 Pix Sistema Parcela 04/2026
    const lines = text.split('\n');
    const pagamentosPagos = [];
    
    for (let line of lines) {
        // Se a linha tem a palavra "Parcela MM/YYYY"
        const parcelaMatch = line.match(/Parcela (\d{2}\/\d{4})/);
        if (parcelaMatch) {
            const refMesAno = parcelaMatch[1];
            // Tem Pix, Dinheiro, Cartão, Transf? (forma de pagamento)
            const isPaid = /Pix|Dinheiro|Cart|Transf/i.test(line);
            if (isPaid) {
                pagamentosPagos.push(refMesAno);
            }
        }
    }
    
    if (pagamentosPagos.length > 0) {
        console.log(`Faturas pagas encontradas para ${alunoNome}:`, pagamentosPagos);
        const { data, error } = await supabase
            .from('pagamentos')
            .update({ status: 'pago' })
            .eq('aluno_id', aluno.id)
            .in('referencia_mes_ano', pagamentosPagos);
            
        if (error) {
            console.error('Erro ao atualizar faturas:', error);
        } else {
            console.log(`✅ Faturas marcadas como pagas com sucesso!`);
        }
    } else {
        console.log(`Nenhuma fatura paga encontrada para ${alunoNome}.`);
    }
}

parseAllPdfs();
