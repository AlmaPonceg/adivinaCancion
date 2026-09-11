import { useState } from 'react';
import { motion } from 'framer-motion';
import { playPlayerBuzzerSound } from '../utils/audioEffects';

/* ── Module-level helpers (hoisted: zero per-render cost) ──────────────── */

function normalizeHex(hex) {
  const h = String(hex || '#4F46E5').replace('#', '');
  if (h.length === 3) return h.split('').map((c) => c + c).join('');
  return h.length === 6 ? h : '4F46E5';
}

// Mix a hex color toward white (percent > 0) or black (percent < 0). Range -100..100.
function shade(hex, percent) {
  const num = parseInt(normalizeHex(hex), 16);
  const amt = Math.round(2.55 * percent);
  const clamp = (n) => Math.min(255, Math.max(0, n));
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0xff) + amt);
  const b = clamp((num & 0xff) + amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const SCREW_POSITIONS = [
  'top-2.5 left-2.5',
  'top-2.5 right-2.5',
  'bottom-2.5 left-2.5',
  'bottom-2.5 right-2.5',
];

// Flat-top hexagon silhouette for the mounting-nut flange peeking past the bezel.
const HEX_NUT_CLIP = 'polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0% 50%)';

// Press physics: fast snap down, spring overshoot + settle on release.
const SNAP_DOWN = 'cubic-bezier(0.3, 0, 0.4, 1)';
const SPRING_RELEASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const LABEL_SHADOW = '0 2px 6px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)';

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
  const isLive = canBuzz && !isDisabled;

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

  /* ── Dome skin per state: multi-stop radial gradients ── */
  const dome = (() => {
    if (isMyTurn) {
      return {
        border: '#34D399',
        background:
          'radial-gradient(circle at 35% 28%, #A7F3D0 0%, #10B981 34%, #047857 68%, #04150F 100%)',
        glow: '0 0 38px rgba(16,185,129,0.55)',
      };
    }
    if (isLive) {
      const hi = shade(teamColor, 62);
      const deep = shade(teamColor, -48);
      return {
        border: teamColor,
        background: `radial-gradient(circle at 35% 28%, ${hi} 0%, ${teamColor} 36%, ${deep} 70%, #04060C 100%)`,
        glow: `0 0 38px ${teamColor}90`,
      };
    }
    if (hasBuzzed) {
      const mid = shade(teamColor, -18);
      const deep = shade(teamColor, -58);
      return {
        border: '#475569',
        background: `radial-gradient(circle at 35% 28%, ${mid} 0%, ${deep} 62%, #04060C 100%)`,
        glow: 'none',
      };
    }
    if (isBlocked) {
      return {
        border: '#64748B',
        background:
          'radial-gradient(circle at 35% 28%, #94A3B8 0%, #475569 45%, #1E293B 72%, #04060C 100%)',
        glow: 'none',
      };
    }
    return {
      border: '#475569',
      background:
        'radial-gradient(circle at 35% 28%, #7C8DA6 0%, #3B4A61 45%, #16202F 72%, #04060C 100%)',
      glow: 'none',
    };
  })();

  return (
    <div className="relative flex flex-col items-center justify-center p-2 select-none touch-none">
      {/* Arcade Cabinet Mounting Plate */}
      <div className="relative p-5 sm:p-7 rounded-[42px] bg-[#111827] border-2 border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.06)]">
        {/* Cabinet screws with Phillips cross slots */}
        {SCREW_POSITIONS.map((pos) => (
          <span
            key={pos}
            className={`absolute ${pos} w-4 h-4 rounded-full border border-slate-950/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.7)] pointer-events-none`}
            style={{
              background:
                'radial-gradient(circle at 35% 30%, #CBD5E1 0%, #64748B 45%, #1E293B 100%)',
            }}
          >
            <span className="absolute top-1/2 left-[2px] right-[2px] h-[1.5px] -translate-y-1/2 bg-slate-950/80 rounded-full" />
            <span className="absolute left-1/2 top-[2px] bottom-[2px] w-[1.5px] -translate-x-1/2 bg-slate-950/80 rounded-full" />
          </span>
        ))}

        {/* Hex mounting-nut flange peeking past the bezel */}
        <div
          className="absolute inset-3 sm:inset-4 pointer-events-none"
          style={{
            clipPath: HEX_NUT_CLIP,
            background:
              'linear-gradient(135deg, #3B475C 0%, #141B28 30%, #2C3648 50%, #0E1320 70%, #46566E 100%)',
            boxShadow: '0 10px 24px rgba(0,0,0,0.7)',
          }}
        />

        {/* Knurled chrome bezel ring with specular highlight */}
        <div
          className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full flex items-center justify-center p-2 shadow-[0_10px_28px_rgba(0,0,0,0.75),0_2px_6px_rgba(0,0,0,0.6)]"
          style={{
            background: `repeating-conic-gradient(from 0deg, rgba(255,255,255,0.14) 0deg 3deg, rgba(0,0,0,0.30) 3deg 6deg), conic-gradient(from 210deg, #8B98AD, #F2F6FC 12%, #5C6B84 28%, #FBFDFF 45%, #46536B 62%, #DCE4EF 78%, #8B98AD 100%)`,
          }}
        >
          {/* Specular crescent catching the top edge of the bezel */}
          <div className="absolute top-[3px] left-1/2 -translate-x-1/2 h-2.5 w-24 rounded-[100%] bg-white/50 blur-[3px] pointer-events-none" />
          <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 h-1.5 w-20 rounded-[100%] bg-black/50 blur-[3px] pointer-events-none" />

          {/* Socket well + dark gasket gap: the shadow ring that sells the depth */}
          <div
            className="w-full h-full rounded-full flex items-center justify-center relative p-1.5"
            style={{
              background: 'radial-gradient(circle at 50% 40%, #1A2233 0%, #05070C 78%)',
              boxShadow:
                'inset 0 8px 18px rgba(0,0,0,1), inset 0 -3px 8px rgba(148,163,184,0.14), 0 1px 0 rgba(255,255,255,0.22)',
            }}
          >
            {/* Halo LED breathing ring when live */}
            {isLive && (
              <motion.div
                className="absolute -inset-3 rounded-full pointer-events-none"
                style={{
                  border: `3px solid ${teamColor}`,
                  boxShadow: `0 0 22px ${teamColor}, inset 0 0 14px ${teamColor}66`,
                }}
                animate={{ opacity: [1, 0.35, 1], scale: [1, 1.06, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            {isLive && (
              <motion.div
                className="absolute -inset-3 rounded-full pointer-events-none blur-md"
                style={{
                  background: `radial-gradient(circle, ${teamColor} 0%, transparent 70%)`,
                }}
                animate={{ opacity: [0.85, 0.35, 0.85], scale: [1, 1.15, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            {/* Turn spotlight aura */}
            {isMyTurn && (
              <motion.div
                className="absolute -inset-4 rounded-full pointer-events-none border-4 border-emerald-400 filter drop-shadow-[0_0_16px_#10B981]"
                animate={{ scale: [1, 1.08, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            {/* Mushroom plunger: sinks INTO the bezel on press */}
            <button
              type="button"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              disabled={isDisabled}
              className={`group relative w-44 h-44 sm:w-50 sm:h-50 rounded-full flex items-center justify-center cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 transition-transform ${
                isPressed
                  ? 'translate-y-[14px] scale-[0.9]'
                  : 'translate-y-0 scale-100 active:translate-y-[14px] active:scale-[0.9]'
              }`}
              style={{
                transitionDuration: isPressed ? '70ms' : '260ms',
                transitionTimingFunction: isPressed ? SNAP_DOWN : SPRING_RELEASE,
                boxShadow: isPressed
                  ? '0 2px 5px rgba(0,0,0,0.9), inset 0 10px 22px rgba(0,0,0,0.7)'
                  : `0 16px 30px rgba(0,0,0,0.85), 0 6px 12px rgba(0,0,0,0.6), inset 0 5px 8px rgba(255,255,255,0.45), inset 0 -10px 18px rgba(0,0,0,0.45), ${dome.glow}`,
              }}
            >
              {/* Plunger dome */}
              <div
                className="w-full h-full rounded-full flex flex-col items-center justify-center relative overflow-hidden border-4"
                style={{ borderColor: dome.border, background: dome.background }}
              >
                {/* Concave dish: inner depth + rim light */}
                <div
                  className="absolute inset-3 sm:inset-4 rounded-full pointer-events-none"
                  style={{
                    boxShadow:
                      'inset 0 12px 26px rgba(0,0,0,0.55), inset 0 -8px 16px rgba(255,255,255,0.14)',
                  }}
                />
                {/* Convex glass reflection arc */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-32 h-14 bg-gradient-to-b from-white/35 via-white/10 to-transparent rounded-full pointer-events-none" />
                {/* Rim light along the lower edge */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-8 bg-gradient-to-t from-white/15 to-transparent rounded-full blur-[2px] pointer-events-none" />

                {/* Perfectly centered icon + label stack */}
                <div className="relative z-10 flex flex-col items-center justify-center text-center gap-1.5 px-6 max-w-full">
                  {isBlocked ? (
                    <svg className="w-9 h-9 text-slate-300 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : isMyTurn ? (
                    <svg className="w-10 h-10 text-white animate-bounce filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  ) : hasBuzzed ? (
                    <svg className="w-9 h-9 text-white filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isLive ? (
                    <svg className="w-10 h-10 text-white animate-pulse filter drop-shadow-[0_2px_10px_rgba(255,255,255,0.7)]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-slate-400/90 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                  )}

                  {/* Arcade label */}
                  <span
                    className={`font-heading font-black uppercase text-center leading-tight text-balance ${
                      isMyTurn || isLive
                        ? 'text-white text-sm sm:text-base tracking-[0.18em]'
                        : isBlocked || hasBuzzed
                        ? 'text-slate-100 text-xs sm:text-sm tracking-[0.18em]'
                        : 'text-slate-300 text-xs sm:text-sm tracking-[0.18em]'
                    }`}
                    style={{ textShadow: LABEL_SHADOW }}
                  >
                    {getLabel()}
                  </span>
                </div>

                {/* Press dimmer: collapses the gloss, cheap opacity-only fade */}
                <div
                  className={`absolute inset-0 rounded-full bg-black pointer-events-none transition-opacity ${
                    isPressed ? 'opacity-45 duration-75' : 'opacity-0 duration-200'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
