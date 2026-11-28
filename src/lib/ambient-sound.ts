/**
 * Ambient Audio Engine for Elixir ("Ambience").
 * Supports 6 seamless loopable audio tracks with immediate user-gesture unlocking
 * and automatic fallback to Web Audio procedural synthesis.
 */

export type SoundscapePreset =
  | "rain"
  | "library"
  | "cafe"
  | "whitenoise"
  | "fireplace"
  | "keyboard";

export interface AmbienceTrackInfo {
  id: SoundscapePreset;
  slug: string;
  label: string;
  filename: string;
  description: string;
  iconName: string;
}

export type SoundscapeInfo = AmbienceTrackInfo;

export const AMBIENCE_TRACKS: AmbienceTrackInfo[] = [
  {
    id: "rain",
    slug: "rain-loop",
    label: "Monsoon Rain",
    filename: "/sounds/rain%20loop.mp3",
    description: "Gentle tropical rain and soothing patter on a windowpane",
    iconName: "CloudRain",
  },
  {
    id: "library",
    slug: "library-sounds",
    label: "Quiet Library",
    filename: "/sounds/library%20sounds.mp3",
    description: "Soft acoustic stillness and peaceful reading room tone",
    iconName: "BookOpen",
  },
  {
    id: "cafe",
    slug: "cafe-ambience",
    label: "Cozy Cafe",
    filename: "/sounds/km007-cafe-ambience-9263.mp3",
    description: "Warm background murmurs and coffeehouse warmth",
    iconName: "Coffee",
  },
  {
    id: "whitenoise",
    slug: "white-noise",
    label: "White Noise",
    filename: "/sounds/blendertimer-white-noise-8117.mp3",
    description: "Smooth static frequencies for deep concentration",
    iconName: "Radio",
  },
  {
    id: "fireplace",
    slug: "fireplace-loop",
    label: "Fireplace Crackling",
    filename: "/sounds/king_of_the_christmas-fireplace-loop-original-noise-178209.mp3",
    description: "Warm hearth embers and gentle wooden sparks",
    iconName: "Flame",
  },
  {
    id: "keyboard",
    slug: "keyboard-typing",
    label: "Typing on Keyboard",
    filename: "/sounds/Typing%20On%20Keyboard.mp3",
    description: "Rhythmic keystrokes and focus-inducing mechanical clicks",
    iconName: "Keyboard",
  },
];

// Backward-compatibility alias
export const SOUNDSCAPES = AMBIENCE_TRACKS;

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: { stop: () => void }[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private currentPreset: SoundscapePreset | null = null;
  private volume: number = 0.7;
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

  public unlock() {
    if (typeof window === "undefined") return;
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === "suspended") {
        void ctx.resume();
      }
    } catch {
      /* ignore */
    }
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
    this.unlock();
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
    this.unlock();
    this.currentPreset = preset;
    this.isPlaying = true;
    this.notify();

    const info = AMBIENCE_TRACKS.find((s) => s.id === preset);
    const audioPath = info ? info.filename : null;

    if (audioPath && typeof window !== "undefined" && typeof Audio !== "undefined") {
      try {
        const audio = new Audio();
        audio.src = audioPath;
        audio.loop = true; // Continuous loop
        audio.volume = this.volume;
        audio.preload = "auto";

        this.currentAudio = audio;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("Audio element play error, falling back to Web Audio synthesis:", err);
            if (this.currentAudio === audio) {
              this.currentAudio = null;
            }
            this.playProcedural(preset);
          });
        }

        audio.onerror = () => {
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
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
      } else if (preset === "whitenoise") {
        this.setupWhiteNoise(ctx, this.masterGain);
      } else if (preset === "fireplace") {
        this.setupFireplace(ctx, this.masterGain);
      } else if (preset === "keyboard") {
        this.setupKeyboard(ctx, this.masterGain);
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

  private setupKeyboard(ctx: AudioContext, dest: GainNode) {
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      if (Math.random() < 0.0006) {
        const clickLen = Math.floor(Math.random() * 40 + 20);
        for (let j = 0; j < clickLen && i + j < bufferSize; j++) {
          data[i + j] = (Math.random() * 2 - 1) * Math.exp(-j / 8) * 0.45;
        }
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2200, ctx.currentTime);
    filter.Q.setValueAtTime(2.5, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, ctx.currentTime);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    src.start();
    this.activeNodes.push({ stop: () => src.stop() });
  }
}

export const ambientSound = typeof window !== "undefined" ? new AmbientSoundEngine() : null;
