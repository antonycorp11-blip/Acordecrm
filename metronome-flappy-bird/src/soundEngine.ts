/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getContext(): AudioContext | null {
    this.init();
    return this.ctx;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMutedState() {
    return this.isMuted;
  }

  private createOscillator(type: OscillatorType, freq: number, duration: number, gainVal: number, pitchEnd?: number) {
    if (this.isMuted || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    if (pitchEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(pitchEnd, now + duration);
    }

    gainNode.gain.setValueAtTime(gainVal, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  public playTick(isStrong: boolean = false) {
    this.init();
    if (this.isMuted || !this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    const freq = isStrong ? 1000 : 700;
    osc.frequency.setValueAtTime(freq, now);

    // Clean transient metronome woodblock click
    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playPerfect() {
    // Silenced to leave only the metronome tick as requested
  }

  public playGood() {
    // Silenced to leave only the metronome tick as requested
  }

  public playEarlyLate() {
    // Silenced to leave only the metronome tick as requested
  }

  public playMiss() {
    // Silenced to leave only the metronome tick as requested
  }

  public playCrash() {
    // White noise style 8-bit crash
    this.init();
    if (this.isMuted || !this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Low rumble square-wave sweeping down
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);

    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.42);

    // Also add a higher pitch crackle for texture
    const noiseOsc = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    noiseOsc.type = 'triangle';
    noiseOsc.frequency.setValueAtTime(600, now);
    noiseOsc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noiseOsc.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noiseOsc.start(now);
    noiseOsc.stop(now + 0.2);
  }

  public playLevelUp() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const now = this.ctx.currentTime;
    // Dynamic Level Up ascending arpeggio (C4, E4, G4, C5)
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, idx) => {
      const playTime = now + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, playTime);

      gainNode.gain.setValueAtTime(0.08, playTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, playTime + 0.2);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(playTime);
      osc.stop(playTime + 0.25);
    });
  }
}

export const soundEngine = new SoundEngine();
