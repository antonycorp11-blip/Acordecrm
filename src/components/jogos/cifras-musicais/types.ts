export interface NoteMapping {
  name: string;       // Portuguese name, e.g. "DÓ", "SOL#", "MI MENOR"
  cipher: string;     // International cipher, e.g. "C", "G#", "Em"
  frequencies: number[]; // Frequencies for synthesizing the chord/note
}

export interface ModuleInfo {
  id: number;
  name: string;
  description: string;
  notes: NoteMapping[];
}

export interface GameState {
  score: number;
  highScore: number;
  lives: number;
  combo: number;
  maxCombo: number;
  level: number;
  currentModuleId: number;
  activeTarget: NoteMapping | null;
  isPlaying: boolean;
  isGameOver: boolean;
  showingChallenge: boolean;
  challengeTimer: number; // in ms
  gameTime: number; // overall game duration in s
}

export interface Laser {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  vx?: number; // angle movement for spread shot
  color?: string;
}

export type PowerUpType = 'spread' | 'speed' | 'shield' | 'bomb' | 'life';

export interface PowerUp {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: PowerUpType;
  speedY: number;
  color: string;
  label: string;
}

export interface Boss {
  active: boolean;
  name: string;
  maxHp: number;
  hp: number;
  x: number;
  y: number;
  width: number;
  height: number;
  cipher: string;
  targetNote: NoteMapping;
  phase: number;
  shootTimer: number;
  dirX: number;
}

export interface BossLaser {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export interface Scenario {
  id: number;
  name: string;
  description: string;
  colorMain: string;
  colorGlow: string;
  bgGradient: string;
  gridColor: string;
  type: 'space' | 'planet' | 'solar' | 'crystal' | 'void';
}

export interface Meteor {
  id: number;
  x: number;
  y: number;
  radius: number;
  cipher: string;
  speedY: number;
  speedX: number;
  color: string;
  isTarget: boolean;
  rotation: number;
  rotationSpeed: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}
