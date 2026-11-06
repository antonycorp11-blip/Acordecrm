const fs = require('fs');

let file = fs.readFileSync('src/pages/AreaAluno.tsx', 'utf8');

// 1. Move "Feed de Atividades" from Ranking to Home
// The feed block starts with {/* FEED DO CRM */} and ends before {/* ===== ABA: RANKING ===== */}
// Wait, the feed is inside the ranking tab now, so it's after {activeTab === 'ranking' && ...
const feedStart = file.indexOf('              {/* FEED DO CRM */}');
const feedEnd = file.indexOf('              <div className="flex items-center gap-3 mb-4">', feedStart);
const feedCode = file.slice(feedStart, feedEnd);

// Remove feed from Ranking
file = file.slice(0, feedStart) + file.slice(feedEnd);

// Find where to insert it in Home (after {activeTab === 'home' && (<div className="px-4 py-5 space-y-4"> )
// Let's put it right after the PERFIL RESUMO (the first box in Home).
// The first box ends with </button> ... </div> ... <div className="pt-2"> ... {/* Conquistas (Badges) */}
// Actually, let's just put it at the very top of Home!
const homeTabStart = file.indexOf('{activeTab === \'home\' && (');
const homeTabContentStart = file.indexOf('<div className="px-4 py-5 space-y-4">', homeTabStart) + '<div className="px-4 py-5 space-y-4">'.length;
file = file.slice(0, homeTabContentStart) + '\n' + feedCode + file.slice(homeTabContentStart);


// 2. Remove Menu Grid from Home
const menuGridStart = file.indexOf('{/* Menu Grid */}');
const menuGridEnd = file.indexOf('</div>', file.indexOf('</div>', file.indexOf('</div>', menuGridStart) + 1) + 1) + '</div>'.length; 
// It's <div className="grid...">{menus.map...}</div>. It has a nested map.
// Let's just find the end of the menu grid.
const menuEndSearch = file.indexOf('            </div>\n          </div>\n          )} {/* end activeTab === home */}');
if (menuGridStart !== -1) {
    file = file.slice(0, menuGridStart) + file.slice(menuEndSearch);
}


// 3. Move Fichas de Treino (Diário de Evolução) from Home to Treino
const diarioStart = file.indexOf('              {/* Diário de Evolução */}');
if (diarioStart === -1) {
   console.log('Could not find Diario de Evolucao');
} else {
    // End of diario is right before {/* Conquistas (Badges) */}
    const diarioEnd = file.indexOf('            {/* Conquistas (Badges) */}');
    const diarioCode = file.slice(diarioStart, diarioEnd);

    // Remove from home
    file = file.slice(0, diarioStart) + file.slice(diarioEnd);

    // Insert into Treino
    // Treino ends right before {activeTab === 'home' && (
    const endOfTreino = file.indexOf('{activeTab === \'home\' && (');
    // We want to insert it before the closing </div>\n          )}\n of the treino tab.
    const insertPoint = file.lastIndexOf('            </div>\n          )\n\n          {/* ===== ABA: TREINO', endOfTreino); // No, that's not right.
    // The closing of treino tab is:
    //             </div>
    //           )}
    // 
    //           {/* ===== ABA: HOME ===== */}
    //           {activeTab === 'home' && (
    const treinoEndMatch = file.lastIndexOf('            </div>\n          )\n\n          {/* ===== ABA: HOME ===== */}');
    let finalInsertPoint = endOfTreino;
    if (file.indexOf('</div>\n          )}\n\n          {activeTab === \'home\'', endOfTreino - 40) !== -1) {
        finalInsertPoint = file.indexOf('</div>\n          )}\n\n          {activeTab === \'home\'', endOfTreino - 40);
    } else {
        // Just find the line before {activeTab === 'home' && (
        const textBeforeHome = file.slice(endOfTreino - 50, endOfTreino);
        finalInsertPoint = endOfTreino - textBeforeHome.split('').reverse().join('').indexOf('} )'); // messy
        // A better way: insert at the end of the 'treino' div.
        const headerTreino = file.indexOf('{activeTab === \'treino\' && (');
        const endOfTreinoDiv = file.indexOf('            </div>\n          )}', headerTreino);
        finalInsertPoint = endOfTreinoDiv;
    }
    
    file = file.slice(0, finalInsertPoint) + diarioCode + file.slice(finalInsertPoint);
}


fs.writeFileSync('src/pages/AreaAluno.tsx', file);
console.log('UI refactored successfully.');
