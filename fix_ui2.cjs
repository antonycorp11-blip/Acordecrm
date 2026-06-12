const fs = require('fs');

let file = fs.readFileSync('src/pages/AreaAluno.tsx', 'utf8');

const diarioStart = file.indexOf('            {/* Diário de Evolução (Musiclass feedbacks) */}');
const diarioEnd = file.indexOf('            {/* Conquistas (Badges) */}');

if (diarioStart !== -1 && diarioEnd !== -1) {
    const diarioCode = file.slice(diarioStart, diarioEnd);

    // Remove from home
    file = file.slice(0, diarioStart) + file.slice(diarioEnd);

    // Find Treino tab end
    const headerTreino = file.indexOf('{activeTab === \'treino\' && (');
    const endOfTreinoDiv = file.indexOf('            </div>\n          )}', headerTreino);
    
    // Insert into Treino
    file = file.slice(0, endOfTreinoDiv) + diarioCode + file.slice(endOfTreinoDiv);
    
    fs.writeFileSync('src/pages/AreaAluno.tsx', file);
    console.log('Diario de Evolucao moved successfully.');
} else {
    console.log('Could not find bounds.');
}
