/**
 * Ambient Soundscapes Engine for Elixir Library Sanctuary.
 * Supports 8 seamless loopable audio tracks with automatic fallback to Web Audio procedural synthesis.
 */

export type SoundscapePreset =
  | "rain"
  | "library"
  | "cafe"
  | "forest"
  | "lofi"
  | "whitenoise"
  | "fireplace"
  | "wind";

export interface SoundscapeInfo {
  id: SoundscapePreset;
  slug: string;
  label: string;
  description: string;
  iconName: string;
}

export const SOUNDSCAPES: SoundscapeInfo[] = [
  { id: "rain", slug: "monsoon-rain", label: "Monsoon Rain", description: "Gentle rain and patter on a windowpane", iconName: "CloudRain" },
  { id: "library", slug: "quiet-library", label: "Quiet Library", description: "Soft acoustic room tone and calm stillness", iconName: "BookOpen" },
  { id: "cafe", slug: "cozy-cafe", label: "Cozy Cafe", description: "Warm background ambience and coffeehouse warmth", iconName: "Coffee" },
  { id: "forest", slug: "mountain-forest", label: "Mountain Forest", description: "Soft breeze through leaves and gentle chirps", iconName: "Trees" },
  { id: "lofi", slug: "lofi", label: "Lofi", description: "Calm study beats and gentle mellow melodies", iconName: "Music" },
  { id: "whitenoise", slug: "white-noise", label: "White Noise", description: "Smooth static frequency for deep concentration", iconName: "Radio" },
  { id: "fireplace", slug: "fireplace-crackling", label: "Fireplace Crackling", description: "Warm hearth embers and gentle wooden sparks", iconName: "Flame" },
  { id: "wind", slug: "wind", label: "Wind", description: "Calm soothing breeze across open mountain peaks", iconName: "Wind" },
];

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: { stop: () => void }[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private currentPreset: SoundscapePreset | null = null;
  private volume: number = 0.5;
  private isPlaying: boolean = false;
  private listeners: Set<() => void> = new Set();

  public subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
  }

  private getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      b5 = -0.76160 * b5 - white * 0.0168980;
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

  private createWhiteNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }
    return buffer;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
    this.notify();
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

  public toggle(preset?: SoundscapePreset) {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play(preset || this.currentPreset || "rain");
    }
  }

  public stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        /* ignore */
      }
      this.currentAudio = null;
    }

    this.activeNodes.forEach((node) => {
      try {
        node.stop();
      } catch {
        /* ignore */
      }
    });
    this.activeNodes = [];
    this.isPlaying = false;
    this.notify();
  }

  public play(preset: SoundscapePreset) {
    this.stop();
    this.currentPreset = preset;
    this.isPlaying = true;
    this.notify();

    const info = SOUNDSCAPES.find((s) => s.id === preset);
    const audioPath = info ? `/sounds/${info.slug}.mp3` : null;

    if (audioPath && typeof window !== "undefined" && typeof Audio !== "undefined") {
      try {
        const audio = new Audio(audioPath);
        audio.loop = true; // Mandatory seamless continuous infinite loop
        audio.volume = this.volume;
        audio.preload = "auto";

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.currentAudio = audio;
            })
            .catch(() => {
              // Fallback to procedural synthesis on error or autoplay restrictions
              this.playProcedural(preset);
            });
        } else {
          this.currentAudio = audio;
        }

        audio.onerror = () => {
          this.playProcedural(preset);
        };
        return;
      } catch {
        this.playProcedural(preset);
        return;
      }
    }

    this.playProcedural(preset);
  }

  private playProcedural(preset: SoundscapePreset) {
    try {
      const ctx = this.getAudioContext();

      if (!this.masterGain) {
        this.masterGain = ctx.createGain();
        this.masterGain.connect(ctx.destination);
      }
      this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);

      if (preset === "rain") {
        this.setupRain(ctx, this.masterGain);
      } else if (preset === "library") {
        this.setupLibrary(ctx, this.masterGain);
      } else if (preset === "cafe") {
        this.setupCafe(ctx, this.masterGain);
      } else if (preset === "forest") {
        this.setupForest(ctx, this.masterGain);
      } else if (preset === "whitenoise") {
        this.setupWhiteNoise(ctx, this.masterGain);
      } else if (preset === "wind") {
        this.setupWind(ctx, this.masterGain);
      } else if (preset === "fireplace") {
        this.setupFireplace(ctx, this.masterGain);
      } else if (preset === "lofi") {
        this.setupLofi(ctx, this.masterGain);
      }
    } catch {
      /* ignore audio context failure */
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

  private setupWhiteNoise(ctx: AudioContext, dest: GainNode) {
    const white = this.createWhiteNoiseBuffer(ctx, 4);
    const src = ctx.createBufferSource();
    src.buffer = white;
    src.loop = true;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);

    src.connect(gain);
    gain.connect(dest);

    src.start();
    this.activeNodes.push({ stop: () => src.stop() });
  }

  private setupWind(ctx: AudioContext, dest: GainNode) {
    const pink = this.createPinkNoiseBuffer(ctx, 6);
    const src = ctx.createBufferSource();
    src.buffer = pink;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.Q.setValueAtTime(2.0, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.1, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(120, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    src.start();
    lfo.start();
    this.activeNodes.push({
      stop: () => {
        src.stop();
        lfo.stop();
      },
    });
  }

  private setupFireplace(ctx: AudioContext, dest: GainNode) {
    const brown = this.createBrownNoiseBuffer(ctx, 4);
    const src = ctx.createBufferSource();
    src.buffer = brown;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(280, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    src.start();
    this.activeNodes.push({ stop: () => src.stop() });
  }

  private setupLofi(ctx: AudioContext, dest: GainNode) {
    const brown = this.createBrownNoiseBuffer(ctx, 5);
    const src = ctx.createBufferSource();
    src.buffer = brown;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    src.start();
    this.activeNodes.push({ stop: () => src.stop() });
  }
}

export const ambientSound = typeof window !== "undefined" ? new AmbientSoundEngine() : null;
