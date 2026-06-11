const fs = require('fs');

let code = fs.readFileSync('src/pages/AreaAluno.tsx', 'utf8');

const regex = /\/\/ 1\. Pede URL de Upload do Google Drive pro backend[\s\S]*?\/\/ 3\. Finaliza no backend para dar permissão pública e pegar o webViewLink[\s\S]*?body: JSON\.stringify\(\{ fileId \}\)\n\s*\}\);\n\n\s*if \(\!finishRes\.ok\) throw new Error\('Falha ao finalizar o envio\.'\);\n\n\s*const \{ webViewLink \} = await finishRes\.json\(\);\n\n\s*finalVideoUrl = webViewLink;/;

const replacement = `// Upload directly to Supabase Storage
      const nomeAlunoSafe = (alunoData?.nome || 'Aluno').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = \`Treino_\${nomeAlunoSafe}_\${Date.now()}.\${extensao}\`;
      
      const { data, error } = await supabase.storage.from('videos').upload(filename, videoBlob, {
          contentType: mime,
          upsert: true
      });
      
      if (error) throw new Error('Falha ao enviar arquivo para a nuvem.');
      
      setUploadProgress(80);
      
      const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(filename);
      finalVideoUrl = publicUrlData.publicUrl;`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/pages/AreaAluno.tsx', code);
    console.log("Upload logic replaced with Supabase Storage");
} else {
    console.log("Regex not matched in AreaAluno.tsx!");
}

