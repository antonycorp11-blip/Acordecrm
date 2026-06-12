const fs = require('fs');

const code = fs.readFileSync('src/pages/AreaAluno.tsx', 'utf8');

// Find start of Feed
const feedStartStr = '              {/* FEED DO CRM */}';
const feedStartIndex = code.indexOf(feedStartStr);

// Find end of Feed
const feedEndStr = '              </div>\n\n\n\n            <div className="bg-[#fff8f6] border-8 border-black p-6 relative overflow-hidden shadow-[12px_12px_0_#000] flex flex-col gap-4">';
const feedEndIndex = code.indexOf(feedEndStr) + '              </div>\n'.length;

const feedBlock = code.slice(feedStartIndex, feedEndIndex);

// Find where to insert it (after Perfil Resumo)
// Perfil Resumo ends right before XP Bar Section
const xpBarStartStr = '            {/* XP Bar Section */}';
const xpBarStartIndex = code.indexOf(xpBarStartStr);

if (feedStartIndex !== -1 && feedEndIndex !== -1 && xpBarStartIndex !== -1) {
    let newCode = code.slice(0, feedStartIndex) + code.slice(feedEndIndex, xpBarStartIndex) + '\n' + feedBlock + '\n' + code.slice(xpBarStartIndex);
    fs.writeFileSync('src/pages/AreaAluno.tsx', newCode);
    console.log("Feed moved successfully!");
} else {
    console.log("Could not find blocks.");
    console.log(feedStartIndex, feedEndIndex, xpBarStartIndex);
}
