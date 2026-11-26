/**
 * Procedural Web Audio API soundscapes for Elixir Library.
 * 100% offline, zero CORS, seamless loops, tiny footprint.
 */

export type SoundscapePreset = "cafe" | "library" | "rain" | "forest";

export interface SoundscapeInfo {
  id: SoundscapePreset;
  label: string;
  description: string;
  iconName: string;
}

export const SOUNDSCAPES: SoundscapeInfo[] = [
  { id: "rain", label: "Monsoon Rain", description: "Gentle rain and patter on a windowpane", iconName: "CloudRain" },
  { id: "library", label: "Quiet Library", description: "Soft acoustic room tone and calm stillness", iconName: "BookOpen" },
  { id: "cafe", label: "Cozy Cafe", description: "Warm background ambience and coffeehouse warmth", iconName: "Coffee" },
  { id: "forest", label: "Mountain Forest", description: "Soft breeze through leaves and gentle chirps", iconName: "Trees" },
];

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: { stop: () => void }[] = [];
  private currentPreset: SoundscapePreset | null = null;
  private volume: number = 0.5;
  private isPlaying: boolean = false;

  private getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private createPinkNoiseBuffer(ctx: AudioContext, seconds = 5): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      data[i] = sample;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private createBrownNoiseBuffer(ctx: AudioContext, seconds = 5): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }
    return buffer;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentPreset(): SoundscapePreset | null {
    return this.currentPreset;
  }

  public stop() {
    this.activeNodes.forEach(node => {
      try { node.stop(); } catch { /* ignore */ }
    });
    this.activeNodes = [];
    this.isPlaying = false;
  }

  public play(preset: SoundscapePreset) {
    this.stop();
    const ctx = this.getAudioContext();

    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.connect(ctx.destination);
    }
    this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);

    this.currentPreset = preset;
    this.isPlaying = true;

    if (preset === "rain") {
      this.setupRain(ctx, this.masterGain);
    } else if (preset === "library") {
      this.setupLibrary(ctx, this.masterGain);
    } else if (preset === "cafe") {
      this.setupCafe(ctx, this.masterGain);
    } else if (preset === "forest") {
      this.setupForest(ctx, this.masterGain);
    }
  }

  private setupRain(ctx: AudioContext, dest: GainNode) {
    const pink = this.createPinkNoiseBuffer(ctx, 4);
    const src = ctx.createBufferSource();
    src.buffer = pink;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1000, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, ctx.currentTime);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    src.start();
    this.activeNodes.push({ stop: () => src.stop() });
  }

  private setupLibrary(ctx: AudioContext, dest: GainNode) {
    const brown = this.createBrownNoiseBuffer(ctx, 4);
    const src = ctx.createBufferSource();
    src.buffer = brown;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(320, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    src.start();
    this.activeNodes.push({ stop: () => src.stop() });
  }

  private setupCafe(ctx: AudioContext, dest: GainNode) {
    const pink = this.createPinkNoiseBuffer(ctx, 4);
    const src = ctx.createBufferSource();
    src.buffer = pink;
    src.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(450, ctx.currentTime);
    bandpass.Q.setValueAtTime(1.2, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);

    src.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(dest);

    src.start();
    this.activeNodes.push({ stop: () => src.stop() });
  }

  private setupForest(ctx: AudioContext, dest: GainNode) {
    const pink = this.createPinkNoiseBuffer(ctx, 5);
    const src = ctx.createBufferSource();
    src.buffer = pink;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.15, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.18, ctx.currentTime);

    const baseGain = ctx.createGain();
    baseGain.gain.setValueAtTime(0.35, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(baseGain.gain);

    src.connect(filter);
    filter.connect(baseGain);
    baseGain.connect(dest);

    src.start();
    lfo.start();
    this.activeNodes.push({
      stop: () => {
        src.stop();
        lfo.stop();
      },
    });
  }
}

export const ambientSound = typeof window !== "undefined" ? new AmbientSoundEngine() : null;
