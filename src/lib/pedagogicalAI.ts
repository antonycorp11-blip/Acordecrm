export const getPedagogicalSuggestion = async (instrument: string, level: string, objective: string): Promise<string> => {
  // Simulando inteligência pedagógica baseada em regras avançadas e dicionário rico de técnicas musicais
  const instClean = (instrument || 'violão').toLowerCase();
  const lvlClean = (level || 'iniciante').toLowerCase();
  
  const pianoPiano = instClean.includes('piano') || instClean.includes('teclado');
  const cordas = instClean.includes('viol') || instClean.includes('guit') || instClean.includes('baix');
  const batera = instClean.includes('bat') || instClean.includes('drum');
  
  let roteiro = `## 🎯 PLANEJAMENTO PEDAGÓGICO DE ${instrument.toUpperCase()} (${level.toUpperCase()})\n\n`;
  roteiro += `**Foco Principal:** ${objective || 'Evolução Técnica Geral e Desenvolvimento Rítmico/Melódico'}\n\n`;
  
  if (pianoPiano) {
    roteiro += `### 🎹 Aquecimento & Técnica (10 min)\n`;
    if (lvlClean.includes('inici') || lvlClean.includes('trainee')) {
      roteiro += `- **Exercício Hanon nº 1 e 2:** Dedilhado alternado focando em independência de dedos na mão esquerda.\n`;
      roteiro += `- **Escala de C Maior e A Menor Natural:** 2 oitavas, mãos separadas depois juntas (tempo: 60 BPM).\n`;
    } else if (lvlClean.includes('intermed')) {
      roteiro += `- **Hanon nº 5 a 10:** Movimento de punho e articulação de dedos 4 e 5.\n`;
      roteiro += `- **Escala em Arpejos de 3ªs e 6ªs:** Mãos juntas em movimento contrário em G e D (tempo: 90 BPM).\n`;
    } else {
      roteiro += `- **Estudos de Czerny Op. 299:** Foco em agilidade, clareza e passagens de polegar rápidas.\n`;
      roteiro += `- **Arpejos complexos com extensões de 9ª e 11ª:** Escalas completas em 4 oitavas (tempo: 120 BPM).\n`;
    }
    
    roteiro += `\n### 🎼 Harmonia & Repertório (20 min)\n`;
    roteiro += `- **Revisão de Acordes:** Prática de inversões de acordes no campo harmônico atual para suavizar transições.\n`;
    roteiro += `- **Leitura à primeira vista / Dinâmica:** Aplicação prática de dinâmicas (forte, piano, crescendo).\n`;
  } else if (cordas) {
    roteiro += `### 🎸 Aquecimento & Técnica (10 min)\n`;
    if (lvlClean.includes('inici') || lvlClean.includes('trainee')) {
      roteiro += `- **Exercício 1-2-3-4 de Coordenação:** Praticar em todas as cordas com palhetada alternada contínua.\n`;
      roteiro += `- **Desenho da Escala Pentatônica:** Posição 1 em Am (foco na clareza do timbre e precisão das notas).\n`;
    } else if (lvlClean.includes('intermed')) {
      roteiro += `- **Licks de Pentatônica com Bends e Ligados:** Foco na afinação do bend de 1 tom e meio tom.\n`;
      roteiro += `- **Dedilhado P-I-M-A:** Padrões clássicos de arpejos de violão clássico e violão popular.\n`;
    } else {
      roteiro += `- **Técnicas de Palhetada Híbrida / Sweep Picking:** Padrões de tríades de 3 e 4 cordas.\n`;
      roteiro += `- **Modos Gregos (Dórico, Mixolídio, Lídio):** Improvisação livre com backing tracks.\n`;
    }
    
    roteiro += `\n### 🎼 Harmonia & Repertório (20 min)\n`;
    roteiro += `- **Formação de Acordes com Pestana:** Posicionamento de polegar atrás do braço do instrumento para evitar fadiga.\n`;
    roteiro += `- **Ritmos / Levadas:** Praticar rítmica com acentuações sincopadas (Pop, Rock, Bossa Nova).\n`;
  } else if (batera) {
    roteiro += `### 🥁 Rudimentos & Coordenação (10 min)\n`;
    if (lvlClean.includes('inici') || lvlClean.includes('trainee')) {
      roteiro += `- **Toque Simples (Single Stroke Roll):** Foco na simetria de altura das baquetas (tempo: 80 BPM).\n`;
      roteiro += `- **Toque Duplo (Double Stroke Roll):** Rebote controlado da baqueta (tempo: 60 BPM).\n`;
    } else if (lvlClean.includes('intermed')) {
      roteiro += `- **Paradiddles Combinados (RLRR LRLL):** Acentuações deslocadas na caixa.\n`;
      roteiro += `- **Flams e Drags:** Exercícios de controle de dinâmica fina.\n`;
    } else {
      roteiro += `- **Rudimentos Híbridos / Rulos de 9 toques:** Aplicação rápida pelo kit de bateria.\n`;
      roteiro += `- **Independência em 4 membros:** Condução em semicolcheia com chimbal em colcheia e bumbo sincopado.\n`;
    }
    
    roteiro += `\n### ⚡ Grooves & Aplicação (20 min)\n`;
    roteiro += `- **Groove de Rock Clássico / Funk Sincopado:** Foco no encaixe preciso com o metrônomo.\n`;
    roteiro += `- **Viradas (Fills):** Transições suaves mantendo o andamento rigoroso sem oscilação.\n`;
  } else {
    roteiro += `### 🎙️ Aquecimento Vocal & Repertório (10 min)\n`;
    roteiro += `- **Vocalizes de Respiração (Sopro Contínuo):** Foco em apoio diafragmático estável.\n`;
    roteiro += `- **Vocalizes de Escala Pentatônica:** Prática com fonemas "Brr" e "Mmm" para colocação de voz.\n`;
  }
  
  roteiro += `\n### ⚔️ Desafio da Semana (Boss Quest)\n`;
  roteiro += `- **Objetivo de Prática:** Treinar 15 minutos diários focando na transição de trechos complexos de repertório.\n`;
  roteiro += `- **Premiação:** +100 XP extras na confirmação de conclusão do diário de treino!`;
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(roteiro);
    }, 600); // Rápido e responsivo
  });
};
