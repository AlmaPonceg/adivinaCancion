import { useState } from 'react';
import { motion } from 'framer-motion';

function playHapticFeedback() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(820, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  } catch {
    /* ignore audio error */
  }

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([40, 20, 30]);
    } catch {
      /* ignore vibration error */
    }
  }
}

export default function BuzzerButton({
  onBuzz,
  canBuzz,
  hasBuzzed,
  isBlocked,
  teamColor = '#4F46E5',
  isMyTurn,
}) {
  const [isPressed, setIsPressed] = useState(false);
  const isDisabled = !canBuzz || hasBuzzed || isBlocked;

  const getLabel = () => {
    if (isBlocked) return 'BLOQUEADO';
    if (isMyTurn) return '¡TU TURNO!';
    if (hasBuzzed) return 'REGISTRADO';
    if (canBuzz) return '¡PULSÁ YA!';
    return 'ESPERÁ...';
  };

  const handlePointerDown = () => {
    if (!isDisabled) {
      setIsPressed(true);
      playHapticFeedback();
    }
  };

  const handlePointerUp = () => {
    setIsPressed(false);
  };

  return (
    <div className="relative flex items-center justify-center p-4">
      {/* Outer socket well */}
      <div className="nm-buzzer-socket relative">
        {/* Pulsing Aura if can buzz */}
        {canBuzz && !isDisabled && (
          <motion.div
            className="absolute -inset-3 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${teamColor}35 0%, transparent 70%)`,
            }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0.2, 0.7] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Turn Aura (Green spotlight) */}
        {isMyTurn && (
          <motion.div
            className="absolute -inset-4 rounded-full pointer-events-none border-4 border-emerald-500 shadow-xl"
            animate={{ scale: [1, 1.08, 1], opacity: [0.9, 0.4, 0.9] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* The 3D Arcade Buzzer Button */}
        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={onBuzz}
          disabled={isDisabled}
          className={`nm-buzzer-button relative w-48 h-48 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed ${
            isPressed ? 'is-pressed' : ''
          }`}
          style={{
            borderColor: isMyTurn ? '#10B981' : canBuzz ? teamColor : '#E2E8F0',
          }}
        >
          {/* Inner Disc with Gradient and Glow */}
          <div
            className="w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center transition-all shadow-md relative overflow-hidden"
            style={{
              background: isMyTurn
                ? 'linear-gradient(145deg, #10B981, #059669)'
                : canBuzz
                ? `linear-gradient(145deg, ${teamColor}, #312E81)`
                : isBlocked
                ? 'linear-gradient(145deg, #94A3B8, #64748B)'
                : 'linear-gradient(145deg, #E2E8F0, #CBD5E1)',
            }}
          >
            {/* Gloss highlight arc */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-28 h-14 bg-white/25 rounded-full blur-xs pointer-events-none" />

            {/* Icon / Status Indicator */}
            {isBlocked ? (
              <svg className="w-8 h-8 text-white/90 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : isMyTurn ? (
              <svg className="w-8 h-8 text-white mb-1 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : canBuzz ? (
              <svg className="w-9 h-9 text-white mb-1 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z" />
              </svg>
            ) : (
              <div className="w-4 h-4 rounded-full bg-slate-400 mb-2" />
            )}

            <span
              className={`text-xs sm:text-sm font-black uppercase tracking-wider text-center px-2 drop-shadow-sm ${
                isDisabled && !isMyTurn ? 'text-white/80' : 'text-white'
              }`}
            >
              {getLabel()}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
