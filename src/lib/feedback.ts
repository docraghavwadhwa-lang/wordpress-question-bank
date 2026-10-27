let ctx: AudioContext | null = null;

function tone(freq: number, start: number, dur: number, gain: number) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.02);
}

/** Soft two-note chime + light vibration for a correct answer; a short click otherwise. */
export function answerFeedback(correct: boolean) {
  try {
    ctx ??= new AudioContext();
    if (correct) {
      tone(880, 0, 0.18, 0.08);
      tone(1320, 0.07, 0.25, 0.06);
    } else {
      tone(220, 0, 0.06, 0.05);
    }
  } catch {
    /* audio unavailable */
  }
  if (correct) navigator.vibrate?.(18);
}
