import { motion, AnimatePresence } from 'framer-motion';

export default function BuzzQueue({ queue, currentJudging }) {
  if (!queue || queue.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="nm-flat p-5 rounded-2xl"
    >
      <p className="label mb-3">Cola de pulsadores registrados</p>

      <div className="space-y-2">
        <AnimatePresence>
          {queue.map((buzz, index) => {
            const isJudging = currentJudging?.playerId === buzz.playerId;

            return (
              <motion.div
                key={buzz.playerId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  isJudging
                    ? 'nm-inset border-2 border-emerald-500/50 bg-emerald-50/50'
                    : 'nm-flat-sm'
                }`}
              >
                {/* Position */}
                <span
                  className={`mono text-sm font-extrabold w-6 text-center shrink-0 ${
                    index === 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  #{index + 1}
                </span>

                {/* Player */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs sm:text-sm truncate text-[var(--color-text-primary)]">
                    {buzz.playerName}
                  </p>
                  <p className="text-[11px] font-medium truncate" style={{ color: buzz.teamColor }}>
                    {buzz.teamName}
                  </p>
                </div>

                {/* Team dot */}
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: buzz.teamColor }}
                />

                {/* Active indicator */}
                {isJudging && (
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider shrink-0 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Respondiendo
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
