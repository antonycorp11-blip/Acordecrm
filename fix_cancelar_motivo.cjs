const fs = require('fs');

let apiCode = fs.readFileSync('api/index.ts', 'utf8');

const oldCode = `            if (reposicao) {
                const { error: err } = await supabase.from('aulas').update({ status: 'reposicao', data: '2099-12-31', horario: '00:00:00' }).eq('id', originalId);
                if (err) throw err;
            } else {
                const { error: err } = await supabase.from('aulas').update({ status: 'falta' }).eq('id', originalId);
                if (err) throw err;
            }`;

const newCode = `            if (reposicao) {
                const { data: currentAula } = await supabase.from('aulas').select('data').eq('id', originalId).single();
                const { error: err } = await supabase.from('aulas').update({ 
                    status: 'reposicao', 
                    data: '2099-12-31', 
                    horario: '00:00:00',
                    data_original: currentAula?.data,
                    motivo_cancelamento: req.body.motivo_cancelamento || null
                }).eq('id', originalId);
                if (err) throw err;
            } else {
                const { error: err } = await supabase.from('aulas').update({ status: 'falta' }).eq('id', originalId);
                if (err) throw err;
            }`;

apiCode = apiCode.replace(oldCode, newCode);
fs.writeFileSync('api/index.ts', apiCode);

console.log('Fixed API index.ts to save data_original and motivo_cancelamento!');
