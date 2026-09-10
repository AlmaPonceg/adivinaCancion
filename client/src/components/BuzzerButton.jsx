import { useState } from 'react';
import { motion } from 'framer-motion';
import { playPlayerBuzzerSound } from '../utils/audioEffects';

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
    if (hasBuzzed) return '¡REGISTRADO!';
    if (canBuzz) return '¡PULSÁ YA!';
    return 'LISTO';
  };

  const handlePointerDown = (e) => {
    // Prevent default touch behavior on mobile to guarantee instant click response
    if (e.cancelable) e.preventDefault();
    if (!isDisabled) {
      setIsPressed(true);
      playPlayerBuzzerSound();
      onBuzz?.();
    }
  };

  const handlePointerUp = () => {
    setIsPressed(false);
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-2 select-none touch-none">
      {/* Arcade Cabinet Mounting Plate */}
      <div className="relative p-5 sm:p-7 rounded-[42px] bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.1)]">
        {/* Arcade Cabinet Screws at 4 corners */}
        <span className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-slate-700 border border-slate-600 shadow-inner" />
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-slate-700 border border-slate-600 shadow-inner" />
        <span className="absolute bottom-2.5 left-2.5 w-2 h-2 rounded-full bg-slate-700 border border-slate-600 shadow-inner" />
        <span className="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full bg-slate-700 border border-slate-600 shadow-inner" />

        {/* Outer Arcade Socket Well */}
        <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 border-4 border-slate-800 shadow-[inset_0_12px_24px_rgba(0,0,0,0.8),0_4px_12px_rgba(0,0,0,0.5)]">
          {/* Intense Neon Underglow Ring when canBuzz */}
          {canBuzz && !isDisabled && (
            <motion.div
              className="absolute -inset-4 rounded-full pointer-events-none filter blur-md"
              style={{
                background: `radial-gradient(circle, ${teamColor} 0%, transparent 70%)`,
              }}
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.8, 0.35, 0.8],
              }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* Turn Spotlight Aura */}
          {isMyTurn && (
            <motion.div
              className="absolute -inset-6 rounded-full pointer-events-none border-4 border-emerald-400 filter drop-shadow-[0_0_16px_#10B981]"
              animate={{ scale: [1, 1.08, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* 3D Mechanical Arcade Push Plunger */}
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            disabled={isDisabled}
            className={`group relative w-44 h-44 sm:w-50 sm:h-50 rounded-full flex items-center justify-center transition-transform duration-75 cursor-pointer disabled:cursor-not-allowed focus:outline-none ${
              isPressed ? 'translate-y-3.5 scale-[0.94]' : 'translate-y-0 active:translate-y-3.5 active:scale-[0.94]'
            }`}
            style={{
              boxShadow: isPressed
                ? '0 2px 4px rgba(0,0,0,0.9), inset 0 8px 16px rgba(0,0,0,0.6)'
                : '0 14px 28px rgba(0,0,0,0.85), 0 6px 10px rgba(0,0,0,0.6), inset 0 4px 6px rgba(255,255,255,0.4)',
            }}
          >
            {/* Plunger Dome with Layered Arcade Glass Effect */}
            <div
              className="w-full h-full rounded-full flex flex-col items-center justify-center p-3 relative overflow-hidden border-4"
              style={{
                borderColor: isMyTurn
                  ? '#34D399'
                  : canBuzz
                  ? teamColor
                  : isBlocked
                  ? '#64748B'
                  : '#475569',
                background: isMyTurn
                  ? 'radial-gradient(circle at 35% 30%, #10B981 0%, #059669 65%, #064E3B 100%)'
                  : canBuzz
                  ? `radial-gradient(circle at 35% 30%, #FFFFFF 0%, ${teamColor} 30%, #1E1B4B 100%)`
                  : isBlocked
                  ? 'radial-gradient(circle at 35% 30%, #94A3B8 0%, #475569 70%, #1E293B 100%)'
                  : 'radial-gradient(circle at 35% 30%, #64748B 0%, #334155 70%, #0F172A 100%)',
              }}
            >
              {/* Convex Glass Reflection Arc */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-32 h-14 bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-full pointer-events-none" />

              {/* Status Graphic */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center">
                {isBlocked ? (
                  <svg className="w-9 h-9 text-slate-300 mb-1 filter drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : isMyTurn ? (
                  <svg className="w-10 h-10 text-white mb-1 animate-bounce filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : hasBuzzed ? (
                  <svg className="w-9 h-9 text-white mb-1 filter drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : canBuzz ? (
                  <svg className="w-10 h-10 text-white mb-1 filter drop-shadow-[0_2px_10px_rgba(255,255,255,0.6)] animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z" />
                  </svg>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-500/80 mb-1.5 border border-slate-400/30" />
                )}

                {/* Arcade Label */}
                <span
                  className={`font-black uppercase tracking-wider text-xs sm:text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${
                    isMyTurn
                      ? 'text-white text-base tracking-widest'
                      : canBuzz
                      ? 'text-white text-sm font-black'
                      : 'text-slate-300'
                  }`}
                >
                  {getLabel()}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
