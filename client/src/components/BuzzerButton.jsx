import { useState } from 'react';
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

// Press physics: fast snap down, spring overshoot + settle on release.
const SNAP_DOWN = 'cubic-bezier(0.3, 0, 0.4, 1)';
const SPRING_RELEASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const LABEL_SHADOW = '0 2px 8px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.55)';

export default function BuzzerButton({
  onBuzz,
  canBuzz,
  hasBuzzed,
  hasTeamBuzzed,
  isBlocked,
  teamColor = '#4F46E5',
  isMyTurn,
}) {
  const [isPressed, setIsPressed] = useState(false);
  const isDisabled = !canBuzz || hasBuzzed || hasTeamBuzzed || isBlocked;
  const isLive = canBuzz && !isDisabled;

  const getLabel = () => {
    if (isBlocked) return 'BLOQUEADO';
    if (isMyTurn) return '¡TU TURNO!';
    if (hasBuzzed) return '¡REGISTRADO!';
    if (hasTeamBuzzed) return 'TU EQUIPO YA TOCÓ';
    if (canBuzz) return '¡PULSÁ YA!';
    return 'LISTO';
  };

  const handlePointerDown = (e) => {
    // Prevent default touch behavior on mobile to guarantee instant click response
    if (e.cancelable) e.preventDefault();
    if (!isDisabled) {
      setIsPressed(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(45);
      }
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
        glow: '0 0 35px rgba(52,211,153,0.7), 0 0 70px rgba(52,211,153,0.35)',
      };
    }
    if (isLive) {
      const hi = shade(teamColor, 62);
      const deep = shade(teamColor, -48);
      return {
        border: teamColor,
        background: `radial-gradient(circle at 35% 28%, ${hi} 0%, ${teamColor} 36%, ${deep} 70%, #04060C 100%)`,
        glow: `0 0 35px ${teamColor}90, 0 0 70px ${teamColor}40`,
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
      {/* Arcade Cabinet Mounting Plate (Daytime Brushed Finish) */}
      <div className="relative p-5 sm:p-7 rounded-[42px] bg-[#EDE7DC] border-2 border-[#D6CDBC] shadow-[0_16px_36px_rgba(24,18,38,0.12),0_2px_8px_rgba(24,18,38,0.06),inset_0_2px_4px_rgba(255,255,255,0.9)]">
        {/* Cabinet screws with Phillips cross slots */}
        {SCREW_POSITIONS.map((pos) => (
          <span
            key={pos}
            className={`absolute ${pos} w-4 h-4 rounded-full border border-[#B8AE9D] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.15)] pointer-events-none`}
            style={{
              background:
                'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #D4CDBC 50%, #A89F8D 100%)',
            }}
          >
            <span className="absolute top-1/2 left-[2px] right-[2px] h-[1.5px] -translate-y-1/2 bg-[#706654] rounded-full" />
            <span className="absolute left-1/2 top-[2px] bottom-[2px] w-[1.5px] -translate-x-1/2 bg-[#706654] rounded-full" />
          </span>
        ))}

        {/* Knurled chrome bezel ring with specular highlight */}
        <div
          className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full flex items-center justify-center p-2 shadow-[0_18px_28px_-10px_rgba(24,18,38,0.2),0_8px_12px_-8px_rgba(24,18,38,0.15),inset_0_3px_8px_rgba(0,0,0,0.15),inset_0_-2px_6px_rgba(255,255,255,0.8)]"
          style={{
            background: `repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0px 1px, rgba(0,0,0,0.04) 1px 2px), conic-gradient(from 0deg, #D4CDBC 0deg, #B5AC98 70deg, #8C826E 140deg, #9C927E 180deg, #B8AE9A 230deg, #D6CDBC 285deg, #F0EAE0 328deg, #D4CDBC 355deg, #D4CDBC 360deg)`,
          }}
        >
          {/* Single soft specular crescent (top-left) + gentle dark falloff (bottom) */}
          <div className="absolute top-[12px] left-[22%] h-2 w-16 -rotate-[18deg] rounded-[100%] bg-white/25 blur-[3px] pointer-events-none" />
          <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 h-2 w-24 rounded-[100%] bg-black/30 blur-[4px] pointer-events-none" />

          {/* Socket well + dark gasket gap: the shadow ring that sells the depth */}
          <div
            className="w-full h-full rounded-full flex items-center justify-center relative p-1.5"
            style={{
              background: 'radial-gradient(circle at 50% 50%, #0B111D 0%, #070B13 62%, #04070D 85%, #03060C 100%)',
              boxShadow:
                'inset 0 3px 6px rgba(0,0,0,0.6), inset 0 10px 24px rgba(0,0,0,0.5)',
            }}
          >
            {/* Mushroom plunger: sinks INTO the bezel on press */}
            <button
              type="button"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onClick={() => {
                if (!isDisabled) onBuzz?.();
              }}
              disabled={isDisabled}
              className={`group relative w-44 h-44 sm:w-50 sm:h-50 rounded-full flex items-center justify-center cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 transition-[transform,box-shadow] ${
                isPressed
                  ? 'translate-y-[3px] scale-[0.96]'
                  : 'translate-y-0 scale-100 active:translate-y-[3px] active:scale-[0.96]'
              }`}
              style={{
                transitionDuration: isPressed ? '70ms' : '260ms',
                transitionTimingFunction: isPressed ? SNAP_DOWN : SPRING_RELEASE,
                boxShadow: isPressed
                  ? '0 0 14px 6px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.35), inset 0 10px 24px rgba(0,0,0,0.5)'
                  : `0 22px 36px -10px rgba(0,0,0,0.5), 0 8px 14px -6px rgba(0,0,0,0.38), 0 2px 6px -2px rgba(0,0,0,0.28), inset 0 5px 8px rgba(255,255,255,0.35), inset 0 -10px 22px rgba(0,0,0,0.35)${dome.glow !== 'none' ? `, ${dome.glow}` : ''}`,
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
                      'inset 0 14px 30px rgba(0,0,0,0.45), inset 0 -10px 20px rgba(255,255,255,0.12)',
                  }}
                />
                {/* Convex glass reflection: ellipse clipped to dome, curved bottom echoing the sphere */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[76%] h-[44%] rounded-b-full pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.06) 55%, transparent 100%)',
                    WebkitMaskImage:
                      'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)',
                    maskImage:
                      'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)',
                    borderBottomLeftRadius: '100%',
                    borderBottomRightRadius: '100%',
                  }}
                />
                {/* Rim light along the lower edge */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-8 bg-gradient-to-t from-white/10 to-transparent rounded-full blur-[3px] pointer-events-none" />

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
