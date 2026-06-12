export interface AvatarSkin {
  id: string;
  name: string;
  rarity: 'Comum' | 'Raro' | 'Épico' | 'Lendário';
  price: number;
  gender: 'M' | 'F';
  url: string;
}

export interface AvatarInstrument {
  id: string;
  name: string;
  type: 'mic' | 'keyboard' | 'guitar' | 'drums';
  rarity: 'Raro' | 'Épico' | 'Lendário';
  price: number;
  url: string;
}

export interface AvatarRankingFont {
  id: string;
  name: string;
  rarity: 'Raro' | 'Épico' | 'Lendário';
  price: number;
  fontFamily: string;
}

export interface AvatarRankingTile {
  id: string;
  name: string;
  rarity: 'Raro' | 'Épico' | 'Lendário';
  price: number;
  className: string; // CSS de borda/efeito
}

export interface AvatarBackground {
  id: string;
  name: string;
  rarity: 'Raro' | 'Épico' | 'Lendário';
  price: number;
  url: string;
}

// Helpers temporários para gerar caixas coloridas enquanto não temos as imagens reais
const placeholderSvg = (color: string, text: string) => 
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="white">${text}</text></svg>`;

export const SKINS: AvatarSkin[] = [
  // Masculinas
  {
    id: 'skin_m_1', name: 'Liam - Básico', rarity: 'Comum', price: 0, gender: 'M',
    url: '/assets/avatars/skin_m_1/idle.png'
  },
  {
    id: 'skin_m_2', name: 'Zane - Rua', rarity: 'Raro', price: 200, gender: 'M',
    url: '/assets/avatars/skin_m_2/idle.png'
  },
  {
    id: 'skin_m_3', name: 'Kael - Ídolo', rarity: 'Épico', price: 500, gender: 'M',
    url: '/assets/avatars/skin_m_3/idle.png'
  },
  {
    id: 'skin_m_4', name: 'Kuro - Sombrio', rarity: 'Épico', price: 500, gender: 'M',
    url: '/assets/avatars/skin_m_4/idle.png'
  },
  {
    id: 'skin_m_5', name: 'Axel - Lenda', rarity: 'Lendário', price: 1000, gender: 'M',
    url: '/assets/avatars/skin_m_5/idle.png'
  },
  // Femininas
  {
    id: 'skin_f_1', name: 'Yui - Colegial', rarity: 'Comum', price: 0, gender: 'F',
    url: '/assets/avatars/skin_f_1/idle.png'
  },
  {
    id: 'skin_f_2', name: 'Chloe - Verão', rarity: 'Raro', price: 200, gender: 'F',
    url: '/assets/avatars/skin_f_2/idle.png'
  },
  {
    id: 'skin_f_3', name: 'Lilith - Gótica', rarity: 'Épico', price: 500, gender: 'F',
    url: '/assets/avatars/skin_f_3/idle.png'
  },
  {
    id: 'skin_f_4', name: 'Hatsune - Pop', rarity: 'Épico', price: 500, gender: 'F',
    url: '/assets/avatars/skin_f_4/idle.png'
  },
  {
    id: 'skin_f_5', name: 'Stella - Lenda', rarity: 'Lendário', price: 1000, gender: 'F',
    url: '/assets/avatars/skin_f_5/idle.png'
  },
];

export const INSTRUMENTS: AvatarInstrument[] = [
  // Mics
  { id: 'inst_mic_1', name: 'Estúdio Clássico', type: 'mic', rarity: 'Raro', price: 200, url: '/assets/instruments/mic_1.png' },
  { id: 'inst_mic_2', name: 'Retrô Vintage', type: 'mic', rarity: 'Raro', price: 200, url: '/assets/instruments/mic_2.png' },
  { id: 'inst_mic_3', name: 'Ídolo Pop Neon', type: 'mic', rarity: 'Épico', price: 500, url: '/assets/instruments/mic_3.png' },
  { id: 'inst_mic_4', name: 'Voz dos Deuses', type: 'mic', rarity: 'Lendário', price: 1000, url: '/assets/instruments/mic_4.png' },
  
  // Keyboards
  { id: 'inst_key_1', name: 'Teclado Estudante', type: 'keyboard', rarity: 'Raro', price: 200, url: '/assets/instruments/key_1.png' },
  { id: 'inst_key_2', name: 'Keytar Retrô', type: 'keyboard', rarity: 'Raro', price: 200, url: '/assets/instruments/key_2.png' },
  { id: 'inst_key_3', name: 'Sintetizador Holográfico', type: 'keyboard', rarity: 'Épico', price: 500, url: '/assets/instruments/key_3.png' },
  { id: 'inst_key_4', name: 'Piano Celestial', type: 'keyboard', rarity: 'Lendário', price: 1000, url: '/assets/instruments/key_4.png' },

  // Guitars
  { id: 'inst_gui_1', name: 'Acústico Clássico', type: 'guitar', rarity: 'Raro', price: 200, url: '/assets/instruments/guitar_1.png' },
  { id: 'inst_gui_2', name: 'Guitarra Rock', type: 'guitar', rarity: 'Raro', price: 200, url: '/assets/instruments/guitar_2.png' },
  { id: 'inst_gui_3', name: 'Metal Sombrio', type: 'guitar', rarity: 'Épico', price: 500, url: '/assets/instruments/guitar_3.png' },
  { id: 'inst_gui_4', name: 'Espírito da Floresta', type: 'guitar', rarity: 'Lendário', price: 1000, url: '/assets/instruments/guitar_4.png' },

  // Drums
  { id: 'inst_drum_1', name: 'Acústica Tradicional', type: 'drums', rarity: 'Raro', price: 200, url: '/assets/instruments/drum_1.png' },
  { id: 'inst_drum_2', name: 'Eletrônica Moderna', type: 'drums', rarity: 'Raro', price: 200, url: '/assets/instruments/drum_2.png' },
  { id: 'inst_drum_3', name: 'Rock de Estádio', type: 'drums', rarity: 'Épico', price: 500, url: '/assets/instruments/drum_3.png' },
  { id: 'inst_drum_4', name: 'Ritmo do Trovão', type: 'drums', rarity: 'Lendário', price: 1000, url: '/assets/instruments/drum_4.png' },
];

export const BACKGROUNDS: AvatarBackground[] = [
  { id: 'bg_1', name: 'Estúdio de Ensaio', rarity: 'Comum', price: 0, url: '/assets/backgrounds/bg_1.jpg' },
  { id: 'bg_2', name: 'Palco de Rock', rarity: 'Raro', price: 150, url: '/assets/backgrounds/bg_2.jpg' },
  { id: 'bg_3', name: 'Cidade Cyberpunk', rarity: 'Épico', price: 400, url: '/assets/backgrounds/bg_3.jpg' },
  { id: 'bg_4', name: 'Floresta Encantada', rarity: 'Lendário', price: 800, url: '/assets/backgrounds/bg_4.jpg' },
];

export const FONTS: AvatarRankingFont[] = [
  { id: 'font_1', name: 'Cyberpunk', rarity: 'Épico', price: 300, fontFamily: 'Courier New, monospace' },
  { id: 'font_2', name: 'Pixel Art', rarity: 'Raro', price: 150, fontFamily: 'monospace' },
  { id: 'font_3', name: 'Neon Legend', rarity: 'Lendário', price: 700, fontFamily: 'Impact, sans-serif' },
];

export const TILES: AvatarRankingTile[] = [
  { id: 'tile_1', name: 'Borda Chamas', rarity: 'Lendário', price: 800, className: 'border-orange-500 shadow-[0_0_15px_#f97316]' },
  { id: 'tile_2', name: 'Neon Cyan', rarity: 'Épico', price: 400, className: 'border-cyan-400 shadow-[0_0_10px_#22d3ee]' },
  { id: 'tile_3', name: 'Moldura Prata', rarity: 'Raro', price: 200, className: 'border-gray-400 bg-gray-900' },
];
