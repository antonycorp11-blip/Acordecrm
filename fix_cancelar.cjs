const fs = require('fs');

let apiCode = fs.readFileSync('api/index.ts', 'utf8');

const oldCode = `            if (reposicao) {
                await supabase.from('aulas').update({ status: 'reposicao', data: null, horario: null }).eq('id', originalId);
            } else {
                await supabase.from('aulas').update({ status: 'falta' }).eq('id', originalId);
            }`;

const newCode = `            if (reposicao) {
                const { error: err } = await supabase.from('aulas').update({ status: 'reposicao', data: '2099-12-31', horario: '00:00:00' }).eq('id', originalId);
                if (err) throw err;
            } else {
                const { error: err } = await supabase.from('aulas').update({ status: 'falta' }).eq('id', originalId);
                if (err) throw err;
            }`;

apiCode = apiCode.replace(oldCode, newCode);
fs.writeFileSync('api/index.ts', apiCode);

console.log('Fixed API index.ts error handling and NULL constraints!');
