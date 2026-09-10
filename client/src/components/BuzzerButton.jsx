import { motion } from 'framer-motion';

export default function BuzzerButton({
  onBuzz,
  canBuzz,
  hasBuzzed,
  isBlocked,
  teamColor = '#D4A853',
  isMyTurn,
}) {
  const isDisabled = !canBuzz || hasBuzzed || isBlocked;

  const getStyle = () => {
    if (isDisabled && !isMyTurn) {
      return {
        background: 'linear-gradient(145deg, #2a2a30, #1f1f24)',
        border: '2px solid #3a3a42',
      };
    }
    return {
      background: `linear-gradient(145deg, ${teamColor}, ${teamColor}bb)`,
      border: `2px solid ${teamColor}60`,
      boxShadow: isMyTurn
        ? `0 0 40px ${teamColor}40, 0 0 80px ${teamColor}15`
        : `0 0 30px ${teamColor}20`,
    };
  };

  const getLabel = () => {
    if (isBlocked) return 'Bloqueado';
    if (hasBuzzed) return 'Enviado';
    if (isMyTurn) return 'Tu turno';
    if (canBuzz) return 'Pulsar';
    return 'Esperar';
  };

  return (
    <div className="relative">
      {/* Breathing ring when active */}
      {canBuzz && !isDisabled && (
        <motion.div
          className="absolute inset-[-8px] rounded-full"
          style={{ border: `2px solid ${teamColor}` }}
          animate={{ scale: [1, 1.12], opacity: [0.35, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      {/* Turn indicator */}
      {isMyTurn && (
        <motion.div
          className="absolute inset-[-12px] rounded-full"
          style={{ border: `2px solid ${teamColor}` }}
          animate={{ opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <motion.button
        whileHover={!isDisabled ? { scale: 1.04 } : {}}
        whileTap={!isDisabled ? { scale: 0.9 } : {}}
        onClick={onBuzz}
        disabled={isDisabled}
        className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full
                   flex items-center justify-center
                   transition-all duration-200
                   cursor-pointer disabled:cursor-not-allowed"
        style={getStyle()}
      >
        {/* Inner shine */}
        <div
          className="absolute top-3 left-5 right-5 h-10 rounded-full opacity-15"
          style={{ background: 'linear-gradient(to bottom, white, transparent)' }}
        />

        <div className="relative z-10 text-center">
          <p className={`text-sm font-bold uppercase tracking-wider ${
            isDisabled && !isMyTurn ? 'text-white/30' : 'text-white/90'
          }`}>
            {getLabel()}
          </p>
        </div>
      </motion.button>
    </div>
  );
}
