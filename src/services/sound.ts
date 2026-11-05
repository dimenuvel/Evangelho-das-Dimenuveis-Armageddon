/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural Web Audio API sound synthesizer
// Completely self-contained, 100% offline, zero external dependencies

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private bgmInterval: number | null = null;
  private isBgmPlaying: boolean = false;

  private soundEnabled: boolean = true;
  private musicEnabled: boolean = true;
  private soundVolume: number = 0.8;
  private musicVolume: number = 0.4;

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.soundEnabled ? this.soundVolume : 0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicEnabled ? this.musicVolume : 0, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  public ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public updateSettings(soundEnabled: boolean, musicEnabled: boolean, soundVol: number, musicVol: number) {
    this.soundEnabled = soundEnabled;
    this.musicEnabled = musicEnabled;
    this.soundVolume = soundVol;
    this.musicVolume = musicVol;

    if (this.ctx) {
      if (this.sfxGain) {
        this.sfxGain.gain.setValueAtTime(soundEnabled ? soundVol : 0, this.ctx.currentTime);
      }
      if (this.musicGain) {
        this.musicGain.gain.setValueAtTime(musicEnabled ? musicVol : 0, this.ctx.currentTime);
      }
    }

    if (musicEnabled && !this.isBgmPlaying) {
      this.startBGM();
    } else if (!musicEnabled && this.isBgmPlaying) {
      this.stopBGM();
    }
  }

  public playClick() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playJump() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.15);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playShoot(type: string = 'MISSILE') {
    if (!this.soundEnabled) return;
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Frequency sweep + noise burst
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'BOWLING') {
      // Deep heavy thud
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.25);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    } else {
      // Classic artillery whistle & pop
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playExplosion(radius: number = 40, isCosmic: boolean = false) {
    if (!this.soundEnabled) return;
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const dur = Math.min(1.4, 0.4 + radius * 0.012);

    // Filtered noise buffer
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isCosmic ? 600 : 350, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);

    // Add deep sub bass rumble
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(isCosmic ? 120 : 90, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + dur);
    subGain.gain.setValueAtTime(0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + dur);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + dur);
  }

  public playHolyChime() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Heavenly celestial chord (C4, E4, G4, C5) with warm shimmer and low volume
    const notes = [261.63, 329.63, 392.0, 523.25];
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.connect(this.sfxGain);

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      gain.connect(filter);
      osc.start(now + idx * 0.08);
      osc.stop(now + 1.3);
    });
  }

  public playBowlingStrike() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Clattering resonant pin wood collision frequencies
    const pinFreqs = [740, 920, 1100, 1350, 1600];
    pinFreqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      const delay = i * 0.035;
      osc.frequency.setValueAtTime(freq + (Math.random() * 80 - 40), now + delay);
      osc.frequency.exponentialRampToValueAtTime(200, now + delay + 0.3);

      gain.gain.setValueAtTime(0.35, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + delay);
      osc.stop(now + delay + 0.4);
    });
    this.playExplosion(35, true);
  }

  public playChakraChime(step: number = 0) {
    if (!this.soundEnabled) return;
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    const scale = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88];
    const freq = scale[step % scale.length];
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.5, now);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playEgoImplosion() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    // Pitch rises inward then drops
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  public playBureaucratStamp() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.2);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playGrunt() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const startFreq = 240 + Math.random() * 80;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playSplash() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const dur = 0.5;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.Q.setValueAtTime(3, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  public playTick() {
    if (!this.soundEnabled) return;
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playVictory(isPlayerWin: boolean = true) {
    if (!this.soundEnabled) return;
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Gentle lowpass filter to remove any high-frequency screech or harsh transients
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1300, now);
    filter.Q.setValueAtTime(0.7, now);
    filter.connect(this.sfxGain);

    if (isPlayerWin) {
      // Warm, melodic, elegant celestial fanfare (soothing pentatonic chords in warm middle register)
      // Notes: C4 (261.63), G4 (392.00), C5 (523.25), E5 (659.25), G5 (783.99)
      const notes = [
        { f: 261.63, t: 0.0, d: 0.7, gain: 0.06 },
        { f: 392.00, t: 0.12, d: 0.7, gain: 0.06 },
        { f: 523.25, t: 0.24, d: 0.8, gain: 0.07 },
        { f: 659.25, t: 0.38, d: 0.9, gain: 0.07 },
        { f: 783.99, t: 0.54, d: 1.2, gain: 0.07 },
      ];

      notes.forEach(({ f, t, d, gain: noteGain }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine'; // pure, mellow, round sine wave (zero harsh harmonics)
        osc.frequency.setValueAtTime(f, now + t);

        // Smooth 35ms linear attack envelope to prevent harsh pops or clicks
        gain.gain.setValueAtTime(0.0001, now + t);
        gain.gain.linearRampToValueAtTime(noteGain, now + t + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);

        osc.connect(gain);
        gain.connect(filter);
        osc.start(now + t);
        osc.stop(now + t + d + 0.05);

        // Subtle sub-octave warmth for full, resonant bell timbre
        const subOsc = this.ctx!.createOscillator();
        const subGain = this.ctx!.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(f / 2, now + t);
        subGain.gain.setValueAtTime(0.0001, now + t);
        subGain.gain.linearRampToValueAtTime(noteGain * 0.25, now + t + 0.035);
        subGain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);

        subOsc.connect(subGain);
        subGain.connect(filter);
        subOsc.start(now + t);
        subOsc.stop(now + t + d + 0.05);
      });
    } else {
      // Soft, tranquil, dignified dimensional resolution
      // Notes: G4 (392.00), Eb4 (311.13), C4 (261.63), G3 (196.00)
      const notes = [
        { f: 392.00, t: 0.0, d: 0.6, gain: 0.05 },
        { f: 311.13, t: 0.15, d: 0.7, gain: 0.05 },
        { f: 261.63, t: 0.30, d: 0.9, gain: 0.05 },
        { f: 196.00, t: 0.48, d: 1.2, gain: 0.05 },
      ];

      notes.forEach(({ f, t, d, gain: noteGain }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + t);

        gain.gain.setValueAtTime(0.0001, now + t);
        gain.gain.linearRampToValueAtTime(noteGain, now + t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);

        osc.connect(gain);
        gain.connect(filter);
        osc.start(now + t);
        osc.stop(now + t + d + 0.05);
      });
    }
  }

  public startBGM() {
    if (!this.musicEnabled || this.isBgmPlaying) return;
    this.ensureContext();
    if (!this.ctx || !this.musicGain) return;

    this.isBgmPlaying = true;
    let step = 0;
    // Cosmic ambient notes in D minor pentatonic: D3, F3, G3, A3, C4, D4
    const scale = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66];

    this.bgmInterval = window.setInterval(() => {
      if (!this.musicEnabled || !this.ctx || !this.musicGain) return;
      const now = this.ctx.currentTime;
      const note = scale[step % scale.length];

      // Arpeggiated soft chime
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note * (step % 4 === 0 ? 1 : 2), now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.8);

      step++;
    }, 450);
  }

  public stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.isBgmPlaying = false;
  }
}

export const sound = new SoundEngine();
