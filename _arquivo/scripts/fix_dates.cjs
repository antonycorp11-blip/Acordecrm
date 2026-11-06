const fs = require('fs');

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf8');

  // Fix filter in AlunoPerfil and AreaAluno
  code = code.replace(/new Date\(\(a\.data \+ 'T23:59:59'\)\.replace\(\/-\/g, '\/'\)\.replace\('T', ' '\)\) < new Date\(\)/g, "(a.data || '2099-12-31') < new Date().toISOString().substring(0, 10)");
  
  // Fix sorting in AlunoPerfil
  code = code.replace(/new Date\(\(\(a\.data \|\| '2099-12-31'\) \+ 'T12:00:00'\)\.replace\(\/-\/g, '\/'\)\.replace\('T', ' '\)\)\.getTime\(\) - new Date\(\(\(b\.data \|\| '2099-12-31'\) \+ 'T12:00:00'\)\.replace\(\/-\/g, '\/'\)\.replace\('T', ' '\)\)\.getTime\(\)/g, "(a.data || '2099-12-31').localeCompare(b.data || '2099-12-31')");

  // Fix format calls manually using replace_file_content to avoid regex group mess-ups.
  // Wait, I can just use a simple replacer function in JS!
  code = code.replace(/new Date\(\(.*?\.data \+ 'T12:00:00'\)\.replace\(\/-\/g, '\/'\)\.replace\('T', ' '\)\)/g, (match) => {
    // Extract the variable name before .data
    const varMatch = match.match(/\(\((.*?)\.data/);
    if (varMatch) return `new Date(${varMatch[1]}.data + 'T12:00:00Z')`;
    return match;
  });
  
  code = code.replace(/new Date\(\(\(.*?\.data \|\| '2099-12-31'\) \+ 'T12:00:00'\)\.replace\(\/-\/g, '\/'\)\.replace\('T', ' '\)\)/g, (match) => {
    const varMatch = match.match(/\(\(\((.*?)\.data/);
    if (varMatch) return `new Date((${varMatch[1]}.data || '2099-12-31') + 'T12:00:00Z')`;
    return match;
  });

  fs.writeFileSync(file, code);
}

fixFile('src/pages/AlunoPerfil.tsx');
fixFile('src/pages/AreaAluno.tsx');
console.log('Fixed dates correctly!');
