/**
 * Web Audio API Chime Utility for DROPOUT Cafe Kitchen & POS
 * 
 * Synthesizes pure, harmonic cafe audio chimes without relying on external MP3 files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  // Resume context if browser suspended it due to lack of initial user interaction
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

/**
 * Play a cheerful, rich harmonic bell chime for incoming orders
 * Notes: F5 (698.25 Hz) -> A5 (880.00 Hz) -> C6 (1046.50 Hz)
 */
export function playNewOrderChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    const notes = [
      { freq: 698.25, time: 0.0, dur: 0.55, gain: 0.35 },    // F5
      { freq: 880.0, time: 0.15, dur: 0.65, gain: 0.4 },     // A5
      { freq: 1046.5, time: 0.3, dur: 0.95, gain: 0.45 },    // C6 (bright bell finish)
    ];

    notes.forEach(({ freq, time, dur, gain }) => {
      const startTime = now + time;

      // Primary sine wave for sweet warmth
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      // Bell envelope: sharp attack, smooth exponential decay
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.025);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + dur + 0.05);

      // Overtone for crisp acoustic bell resonance
      const overtone = ctx.createOscillator();
      const overGain = ctx.createGain();

      overtone.type = "triangle";
      overtone.frequency.setValueAtTime(freq * 2, startTime);

      overGain.gain.setValueAtTime(0, startTime);
      overGain.gain.linearRampToValueAtTime(gain * 0.25, startTime + 0.02);
      overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur * 0.4);

      overtone.connect(overGain);
      overGain.connect(ctx.destination);

      overtone.start(startTime);
      overtone.stop(startTime + dur * 0.5);
    });
  } catch (err) {
    console.warn("Unable to play audio chime:", err);
  }
}

/**
 * Unlocks the browser AudioContext on user interaction
 */
export function unlockAudioContext(): void {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  } catch {
    // ignore
  }
}

/**
 * Play a double-beep kitchen alert chime for delayed orders (>20m)
 */
export function playDelayedOrderAlert(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    [0, 0.22].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(659.25, now + offset); // E5

      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.25, now + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  } catch (err) {
    console.warn("Unable to play alert chime:", err);
  }
}
