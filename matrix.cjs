const matrix = [
  ".....hhhhh......",
  "....hhhhhhh.....",
  "....hsssssh.....",
  "....hsesesh.....",
  "....hsssssh.....",
  "....hhssshh.....",
  "......nnn.......",
  "....ccccccc.....",
  "...ccccccccc....",
  "...ccccccc.cc...",
  "...ccccccc.cc...",
  ".....ppppp......",
  ".....pp.pp......",
  ".....pp.pp......",
  ".....bb.bb......",
  "................"
];

function generateSVG() {
  let rects = "";
  for(let y=0; y<16; y++) {
     for(let x=0; x<16; x++) {
        const char = matrix[y][x];
        if (char === '.') continue;
        
        let fill = '';
        if (char === 'h') fill = "{currentHairColor}";
        if (char === 's') fill = "{skinColor}";
        if (char === 'e') fill = "#000";
        if (char === 'n') fill = "{skinColor}";
        if (char === 'c') fill = "{currentShirtColor}";
        if (char === 'p') fill = "#1e3a8a"; // dark blue jeans
        if (char === 'b') fill = "#451a03"; // dark brown boots
        
        rects += `        <rect x="${x}" y="${y}" width="1" height="1" fill="${fill}" />\n`;
     }
  }
  return rects;
}

console.log(generateSVG());
