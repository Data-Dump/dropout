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

let activeOscillators: OscillatorNode[] = [];
let chimeTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Stops any actively playing order chimes immediately
 */
export function stopNewOrderChime(): void {
  try {
    if (chimeTimeoutId) {
      clearTimeout(chimeTimeoutId);
      chimeTimeoutId = null;
    }
    activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    });
    activeOscillators = [];
  } catch {
    // ignore
  }
}

/**
 * Play a high-volume, 10-second recurring harmonic bell chime for incoming kitchen orders
 * Cycles repeat across 10 seconds (0s, 2s, 4s, 6s, 8s) with high gain (0.85-0.95) to punch through kitchen ambient noise.
 * Notes: F5 (698.25 Hz) -> A5 (880.00 Hz) -> C6 (1046.50 Hz)
 */
export function playNewOrderChime(): void {
  try {
    // Stop any existing ringing sequence before starting a fresh 10-second alert
    stopNewOrderChime();

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const newActiveOscs: OscillatorNode[] = [];

    // 5 repeated alert chime cycles spanning the full 10-second duration
    const cycles = [0, 2.0, 4.0, 6.0, 8.0];

    cycles.forEach((cycleStart) => {
      const notes = [
        { freq: 698.25, time: cycleStart + 0.0, dur: 0.65, gain: 0.85 },   // F5
        { freq: 880.00, time: cycleStart + 0.18, dur: 0.75, gain: 0.90 },  // A5
        { freq: 1046.50, time: cycleStart + 0.36, dur: 1.15, gain: 0.95 }, // C6 (bright penetrating bell)
      ];

      notes.forEach(({ freq, time, dur, gain }) => {
        const startTime = now + time;

        // Primary fundamental oscillator (sine wave for rich bell ring)
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + dur + 0.05);
        newActiveOscs.push(osc);

        // Acoustic overtone (triangle wave at 2x freq for physical bell strike clarity)
        const overtone = ctx.createOscillator();
        const overGain = ctx.createGain();

        overtone.type = "triangle";
        overtone.frequency.setValueAtTime(freq * 2, startTime);

        overGain.gain.setValueAtTime(0, startTime);
        overGain.gain.linearRampToValueAtTime(gain * 0.35, startTime + 0.02);
        overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur * 0.45);

        overtone.connect(overGain);
        overGain.connect(ctx.destination);

        overtone.start(startTime);
        overtone.stop(startTime + dur * 0.45 + 0.05);
        newActiveOscs.push(overtone);
      });
    });

    activeOscillators = newActiveOscs;

    // Reset reference after 10.5 seconds when sequence completes
    chimeTimeoutId = setTimeout(() => {
      activeOscillators = [];
      chimeTimeoutId = null;
    }, 10500);
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
