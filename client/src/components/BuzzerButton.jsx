import { useState } from 'react';
import { motion } from 'framer-motion';

export default function BuzzerButton({
  onBuzz,
  canBuzz,
  hasBuzzed,
  isBlocked,
  teamColor = '#3182CE',
  isMyTurn,
}) {
  const [isPressed, setIsPressed] = useState(false);
  const isDisabled = !canBuzz || hasBuzzed || isBlocked;

  const getLabel = () => {
    if (isBlocked) return 'Bloqueado';
    if (hasBuzzed) return 'Enviado';
    if (isMyTurn) return '¡Tu turno!';
    if (canBuzz) return 'Pulsar';
    return 'Esperar';
  };

  const handlePointerDown = () => {
    if (!isDisabled) setIsPressed(true);
  };

  const handlePointerUp = () => {
    setIsPressed(false);
  };

  return (
    <div className="relative flex items-center justify-center p-4">
      {/* Outer Concave Socket well */}
      <div className="nm-buzzer-socket p-3 sm:p-4 rounded-full">
        {/* Pulsing Aura if can buzz or my turn */}
        {canBuzz && !isDisabled && (
          <motion.div
            className="absolute inset-2 sm:inset-1 rounded-full pointer-events-none"
            style={{ border: `2px solid ${teamColor}` }}
            animate={{ scale: [1, 1.08], opacity: [0.5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        {isMyTurn && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ border: `3px solid #38A169` }}
            animate={{ opacity: [0.8, 0.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* The Central Circular Neumorphic Button */}
        <motion.button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={onBuzz}
          disabled={isDisabled}
          className={`nm-buzzer-button relative w-44 h-44 sm:w-52 sm:h-52 rounded-full
                      flex flex-col items-center justify-center transition-all duration-150
                      cursor-pointer disabled:cursor-not-allowed ${isPressed ? 'is-pressed' : ''}`}
          style={{
            border: isMyTurn ? '3px solid #38A169' : `2px solid ${teamColor}40`,
          }}
        >
          {/* Subtle colored accent ring inside the button */}
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center"
            style={{
              background: isPressed
                ? 'transparent'
                : 'linear-gradient(145deg, #ffffff, #dbe2ed)',
              boxShadow: isPressed
                ? 'inset 4px 4px 8px var(--nm-shadow-dark), inset -4px -4px 8px var(--nm-shadow-light)'
                : '4px 4px 10px var(--nm-shadow-dark), -4px -4px 10px var(--nm-shadow-light)',
            }}
          >
            {/* Color dot */}
            <div
              className="w-3 h-3 rounded-full mb-1.5"
              style={{ backgroundColor: isMyTurn ? '#38A169' : teamColor }}
            />

            <span
              className={`text-sm sm:text-base font-extrabold uppercase tracking-wider ${
                isDisabled && !isMyTurn
                  ? 'text-[var(--color-text-muted)]'
                  : 'text-[var(--color-text-primary)]'
              }`}
            >
              {getLabel()}
            </span>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
