/**
 * Audio Alert Utility for DROPOUT Cafe Kitchen & POS
 *
 * Plays /order_ring.mp3 when new orders arrive in /kitchen or /admin,
 * with a Web Audio API fallback if the MP3 cannot be played.
 */

let audioCtx: AudioContext | null = null;
let ringAudio: HTMLAudioElement | null = null;
let activeOscillators: OscillatorNode[] = [];
let chimeTimeoutId: ReturnType<typeof setTimeout> | null = null;

function isStaffAudioRoute(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname || "";
  return path.startsWith("/kitchen") || path.startsWith("/admin");
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

function getRingAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;

  if (!ringAudio) {
    ringAudio = new Audio("/order_ring.mp3");
    ringAudio.preload = "auto";
    ringAudio.volume = 1.0;
  }

  return ringAudio;
}

/**
 * Stops any actively playing order ring or fallback chime immediately.
 */
export function stopNewOrderChime(): void {
  try {
    if (ringAudio) {
      ringAudio.pause();
      ringAudio.currentTime = 0;
    }
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

function playFallbackSynthesizedChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const newActiveOscs: OscillatorNode[] = [];
    const cycles = [0, 2.0, 4.0];

    cycles.forEach((cycleStart) => {
      const notes = [
        { freq: 698.25, time: cycleStart + 0.0, dur: 0.65, gain: 0.85 },
        { freq: 880.0, time: cycleStart + 0.18, dur: 0.75, gain: 0.9 },
        { freq: 1046.5, time: cycleStart + 0.36, dur: 1.15, gain: 0.95 },
      ];

      notes.forEach(({ freq, time, dur, gain }) => {
        const startTime = now + time;
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
      });
    });

    activeOscillators = newActiveOscs;
    chimeTimeoutId = setTimeout(() => {
      activeOscillators = [];
      chimeTimeoutId = null;
    }, 6500);
  } catch (err) {
    console.warn("Unable to play fallback audio chime:", err);
  }
}

/**
 * Plays /order_ring.mp3 for incoming kitchen/admin orders.
 */
export function playNewOrderChime(): void {
  try {
    if (!isStaffAudioRoute()) return;
    stopNewOrderChime();

    const audio = getRingAudio();
    if (!audio) {
      playFallbackSynthesizedChime();
      return;
    }

    audio.muted = false;
    audio.volume = 1.0;
    audio.currentTime = 0;

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((err) => {
        console.warn("MP3 playback blocked or failed, using fallback chime:", err);
        playFallbackSynthesizedChime();
      });
    }
  } catch (err) {
    console.warn("Unable to play order_ring.mp3:", err);
    playFallbackSynthesizedChime();
  }
}

/**
 * Unlocks browser audio playback on user interaction (login / button click).
 */
export function unlockAudioContext(): void {
  try {
    if (!isStaffAudioRoute()) return;
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const audio = getRingAudio();
    if (audio && audio.paused) {
      audio.muted = true;
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        }).catch(() => {
          audio.muted = false;
        });
      } else {
        audio.muted = false;
      }
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
    if (!isStaffAudioRoute()) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    [0, 0.22].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(659.25, now + offset);

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
