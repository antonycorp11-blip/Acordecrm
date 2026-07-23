class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterVolume: GainNode | null = null;
  private soundEnabled: boolean = true;
  private bgmEnabled: boolean = true;
  private isBossMode: boolean = false;
  private bgmTimer: any = null;
  private bgmStep: number = 0;

  constructor() {
    // We will initialize lazily to satisfy browser security policies
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterVolume = this.ctx.createGain();
        this.masterVolume.gain.setValueAtTime(0.5, this.ctx.currentTime); // Louder, immersive volume
        this.masterVolume.connect(this.ctx.destination);
      }
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser:", e);
    }
  }

  public toggleSound(enabled: boolean) {
    this.soundEnabled = enabled;
    if (!enabled) {
      this.stopBGM();
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public toggleBGM(enabled?: boolean) {
    this.bgmEnabled = enabled !== undefined ? enabled : !this.bgmEnabled;
    if (!this.bgmEnabled) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.bgmEnabled;
  }

  public isBGMActive(): boolean {
    return this.bgmEnabled;
  }

  public setBossMode(isBoss: boolean) {
    if (this.isBossMode === isBoss) return;
    this.isBossMode = isBoss;
    if (this.bgmTimer) {
      this.stopBGM();
      this.startBGM();
    }
  }

  public startBGM() {
    if (!this.soundEnabled || !this.bgmEnabled) return;
    this.resume();
    if (!this.ctx || !this.masterVolume) return;

    if (this.bgmTimer) return; // already running

    // 1. Normal Exploration Theme (Upbeat 136 BPM - C major / A minor / F major / G major)
    const normalBass = [
      130.81, 130.81, 196.00, 130.81, // C3
      110.00, 110.00, 164.81, 110.00, // A2
      87.31,  87.31,  130.81, 87.31,  // F2
      98.00,  98.00,  146.83, 98.00   // G2
    ];

    const normalMelody = [
      [261.63, 329.63, 392.00], // C major
      [261.63, 329.63, 523.25], 
      [220.00, 261.63, 329.63], // A minor
      [220.00, 329.63, 440.00],
      [174.61, 220.00, 261.63], // F major
      [220.00, 261.63, 349.23],
      [196.00, 246.94, 293.66], // G major
      [246.94, 293.66, 392.00]
    ];

    // 2. Thrilling Boss Battle Theme (Fast 188 BPM - D minor / G minor / A7 driving saw)
    const bossBass = [
      146.83, 146.83, 220.00, 146.83, // D3
      146.83, 293.66, 146.83, 220.00, 
      98.00,  98.00,  146.83, 98.00,  // G2
      110.00, 110.00, 164.81, 220.00  // A2 / A7
    ];

    const bossMelody = [
      [293.66, 349.23, 440.00], // D minor
      [349.23, 440.00, 587.33], 
      [196.00, 233.08, 293.66], // G minor
      [220.00, 277.18, 329.63]  // A major/A7
    ];

    this.bgmStep = 0;
    const stepInterval = this.isBossMode ? 160 : 210; // Boss music is much faster & intense!

    this.bgmTimer = setInterval(() => {
      if (!this.ctx || !this.masterVolume || !this.bgmEnabled || !this.soundEnabled) return;

      const now = this.ctx.currentTime;
      const step = this.bgmStep % 16;
      this.bgmStep++;

      const isBoss = this.isBossMode;
      const bassNotes = isBoss ? bossBass : normalBass;
      const melodyNotes = isBoss ? bossMelody : normalMelody;

      // 1. Bass Synth note (Louder & Punchier)
      const bassFreq = bassNotes[step];
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      
      bassOsc.type = isBoss ? "sawtooth" : "triangle";
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      const bassVol = isBoss ? 0.16 : 0.11;
      bassGain.gain.setValueAtTime(0, now);
      bassGain.gain.linearRampToValueAtTime(bassVol, now + 0.02);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + (isBoss ? 0.14 : 0.19));

      bassOsc.connect(bassGain);
      bassGain.connect(this.masterVolume);
      bassOsc.start(now);
      bassOsc.stop(now + (isBoss ? 0.15 : 0.20));

      // 2. Synth Lead / Arpeggio
      if (step % 2 === 0) {
        const chordIndex = Math.floor(step / 2) % melodyNotes.length;
        const chord = melodyNotes[chordIndex];
        const noteFreq = chord[step % chord.length];

        const melOsc = this.ctx.createOscillator();
        const melGain = this.ctx.createGain();
        melOsc.type = isBoss ? "square" : "sine";
        melOsc.frequency.setValueAtTime(noteFreq, now);

        const melVol = isBoss ? 0.08 : 0.06;
        melGain.gain.setValueAtTime(0, now);
        melGain.gain.linearRampToValueAtTime(melVol, now + 0.02);
        melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(isBoss ? 1600 : 1000, now);

        melOsc.connect(filter);
        filter.connect(melGain);
        melGain.connect(this.masterVolume);

        melOsc.start(now);
        melOsc.stop(now + 0.30);
      }

      // 3. Extra Boss Alarm Pulse on every 4th step!
      if (isBoss && step % 4 === 0) {
        const alarmOsc = this.ctx.createOscillator();
        const alarmGain = this.ctx.createGain();
        alarmOsc.type = "sawtooth";
        alarmOsc.frequency.setValueAtTime(880, now); // High A5
        alarmOsc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

        alarmGain.gain.setValueAtTime(0.05, now);
        alarmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        alarmOsc.connect(alarmGain);
        alarmGain.connect(this.masterVolume);
        alarmOsc.start(now);
        alarmOsc.stop(now + 0.13);
      }
    }, stepInterval);
  }

  public stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  public resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public playLaser() {
    if (!this.soundEnabled) return;
    this.resume();
    if (!this.ctx || !this.masterVolume) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    const now = this.ctx.currentTime;

    // Sweep from 800Hz to 150Hz in 0.15s
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterVolume);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playExplosion() {
    if (!this.soundEnabled) return;
    this.resume();
    if (!this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const duration = 0.35;

    // We can generate real retro White Noise
    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter to make it sound like a space explosion
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterVolume);

      noise.start(now);
      noise.stop(now + duration);
    } catch (e) {
      // Fallback simple low pitch synth sweep if buffer creation fails
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(30, now + duration);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + duration);
      osc.connect(gain);
      gain.connect(this.masterVolume);
      osc.start(now);
      osc.stop(now + duration);
    }
  }

  public playFailure() {
    if (!this.soundEnabled) return;
    this.resume();
    if (!this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const duration = 0.3;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "triangle";

    // Unpleasant dissonant chord (low buzz)
    osc1.frequency.setValueAtTime(130, now);
    osc2.frequency.setValueAtTime(135, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterVolume);

    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  public playSuccess() {
    if (!this.soundEnabled) return;
    this.resume();
    if (!this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    
    // Quick cheerful ascending arpeggio (C5 -> E5 -> G5)
    const playTone = (freq: number, startOffset: number, length: number) => {
      if (!this.ctx || !this.masterVolume) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + startOffset);
      
      gain.gain.setValueAtTime(0, now + startOffset);
      gain.gain.linearRampToValueAtTime(0.15, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + length);
      
      osc.connect(gain);
      gain.connect(this.masterVolume);
      
      osc.start(now + startOffset);
      osc.stop(now + startOffset + length);
    };

    playTone(523.25, 0.0, 0.15); // C5
    playTone(659.25, 0.06, 0.15); // E5
    playTone(783.99, 0.12, 0.25); // G5
  }

  /**
   * Plays a custom chord/note polyphonically based on array of frequencies.
   */
  public playChord(frequencies: number[], duration = 0.8) {
    if (!this.soundEnabled) return;
    this.resume();
    if (!this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    
    // We create multiple oscillators running in parallel
    frequencies.forEach((freq) => {
      if (!this.ctx || !this.masterVolume) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Use a warm triangle wave for a cozy retro synth-keyboard feel
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      // Lowpass filter to smooth the high-ends
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1200, now);

      // Attack: 0.05s, Decay: 0.1s, Sustain: 0.6, Release: 0.2s
      const perOscVolume = 0.18 / Math.max(1, frequencies.length); // keep total volume balanced
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(perOscVolume, now + 0.05);
      gain.gain.setValueAtTime(perOscVolume, now + duration - 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterVolume);

      osc.start(now);
      osc.stop(now + duration + 0.1);
    });
  }
  public playPowerup() {
    if (!this.soundEnabled) return;
    this.resume();
    if (!this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const playTone = (freq: number, startOffset: number, length: number) => {
      if (!this.ctx || !this.masterVolume) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0, now + startOffset);
      gain.gain.linearRampToValueAtTime(0.2, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + length);
      osc.connect(gain);
      gain.connect(this.masterVolume);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + length);
    };

    playTone(440, 0.0, 0.1);  // A4
    playTone(554.37, 0.05, 0.1); // C#5
    playTone(659.25, 0.10, 0.1); // E5
    playTone(880, 0.15, 0.25);  // A5
  }

  public playBossSiren() {
    if (!this.soundEnabled) return;
    this.resume();
    if (!this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.3);
    osc.frequency.linearRampToValueAtTime(200, now + 0.6);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
    osc.connect(gain);
    gain.connect(this.masterVolume);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  public playBossHit() {
    if (!this.soundEnabled) return;
    this.resume();
    if (!this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(this.masterVolume);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playTargetShift() {
    if (!this.soundEnabled) return;
    this.resume();
    if (!this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(this.masterVolume);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playBomb() {
    if (!this.soundEnabled) return;
    this.resume();
    if (!this.ctx || !this.masterVolume) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.2);
    osc.frequency.linearRampToValueAtTime(40, now + 0.5);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.connect(gain);
    gain.connect(this.masterVolume);
    osc.start(now);
    osc.stop(now + 0.5);
  }
}

export const audio = new AudioEngine();
