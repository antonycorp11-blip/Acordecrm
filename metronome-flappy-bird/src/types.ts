/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'STATS' | 'LESSONS' | 'PRACTICE' | 'SHOP';

export type AccuracyType = 'PERFECT' | 'GOOD' | 'EARLY' | 'LATE' | 'MISS';

export interface Character {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlocked: boolean;
  type: 'BIRD' | 'EIGHTH_NOTE' | 'TREBLE_CLEF' | 'CASSETTE';
  color: string;
}

export interface Bird {
  y: number;
  vy: number;
  size: number;
  angle: number;
  flapTime: number;
  pulseScale: number;
}

export interface Obstacle {
  id: number;
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
  width: number;
  isMoving: boolean;
  direction: 1 | -1;
  range: number;
  initialTopHeight: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  accuracy: AccuracyType;
  life: number; // 0 to 1
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface UserStats {
  highScore: number;
  totalAttempts: number;
  perfectHits: number;
  goodHits: number;
  misses: number;
  avgAccuracy: number;
  totalTaps: number;
  longestCombo: number;
  unlockedStage: number;
  unlockedCharacterIds?: string[];
  selectedCharacterId?: string;
  coins?: number;
}

export interface Lesson {
  id: number;
  title: string;
  bpm: number;
  description: string;
  minAccuracy: number;
  targetPipes: number;
  difficulty: 'Fácil' | 'Médio' | 'Difícil' | 'Mestre';
  unlocked: boolean;
  completed: boolean;
}
