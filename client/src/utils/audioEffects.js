let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Mobile Player Buzzer Sound:
 * Snappy arcade microswitch click + bright retro laser chirp.
 * Tactile, fast and distinct on the phone of the player who buzzes.
 */
export function playPlayerBuzzerSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Oscillator 1: Fast retro pitch-drop chirp (arcade tactile feedback)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1400, now);
    osc1.frequency.exponentialRampToValueAtTime(350, now + 0.12);

    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.linearRampToValueAtTime(0.01, now + 0.12);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Oscillator 2: High-frequency click impulse (simulates physical arcade switch)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(800, now);
    osc2.frequency.setValueAtTime(1200, now + 0.02);

    gain2.gain.setValueAtTime(0.25, now);
    gain2.gain.linearRampToValueAtTime(0.001, now + 0.05);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.05);
  } catch (e) {
    console.warn('Player audio feedback error:', e);
  }

  // Haptic vibration on mobile devices
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([50, 30, 50]);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Host Screen Buzzer Sound:
 * Big, dramatic TV game-show alarm / arcade siren fanfare chord.
 * Deep, resonant, and cuts through any ambient sound so the whole room hears it.
 */
export function playHostBuzzerSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Harmonic fanfare frequencies (Classic Gameshow alert chord: D4 + G4 + B4 + D5)
    const freqs = [293.66, 392.0, 493.88, 587.33];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Rich sawtooth / brass waveform
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';

      // Dramatic initial pitch slide up into the chord
      osc.frequency.setValueAtTime(freq * 0.85, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.06);

      // Amplitude envelope: loud punch followed by resonant 550ms ringout
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.setValueAtTime(0.25, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.55);
    });
  } catch (e) {
    console.warn('Host audio feedback error:', e);
  }
}
