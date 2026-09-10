import { motion, AnimatePresence } from 'framer-motion';

export default function BuzzQueue({ queue, currentJudging }) {
  if (!queue || queue.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <p className="label mb-4">Cola de pulsadores</p>

      <div className="space-y-1.5">
        <AnimatePresence>
          {queue.map((buzz, index) => {
            const isJudging = currentJudging?.playerId === buzz.playerId;

            return (
              <motion.div
                key={buzz.playerId}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200 ${
                  isJudging
                    ? 'bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]/30'
                    : 'bg-[var(--color-bg-elevated)]'
                }`}
              >
                {/* Position */}
                <span className={`mono text-sm font-bold w-6 text-center shrink-0 ${
                  index === 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
                }`}>
                  {index + 1}
                </span>

                {/* Player */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{buzz.playerName}</p>
                  <p className="text-xs truncate" style={{ color: buzz.teamColor }}>
                    {buzz.teamName}
                  </p>
                </div>

                {/* Team dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: buzz.teamColor }}
                />

                {/* Judging */}
                {isJudging && (
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-[10px] font-semibold text-[var(--color-accent)] uppercase tracking-wider shrink-0"
                  >
                    Activo
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
