import { motion, AnimatePresence } from 'framer-motion';

export default function BuzzQueue({ queue, currentJudging }) {
  if (!queue || queue.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="console-card p-5 sm:p-6 rounded-3xl"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-black uppercase tracking-wider text-slate-300">
          Orden de Pulsadores
        </p>
        <span className="mono text-xs font-bold text-[var(--color-neon-indigo)] bg-indigo-950/60 border border-indigo-800/80 px-2 py-0.5 rounded-md">
          {queue.length} en cola
        </span>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {queue.map((buzz, index) => {
            const isJudging = currentJudging?.playerId === buzz.playerId;

            return (
              <motion.div
                key={buzz.playerId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all border ${
                  isJudging
                    ? 'border-emerald-500 bg-emerald-950/50 shadow-xs'
                    : 'border-slate-800 bg-[#0B0F19]'
                }`}
              >
                {/* Position */}
                <span
                  className={`mono text-xs font-black w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    index === 0
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-[#111827] border border-slate-700 text-slate-300'
                  }`}
                >
                  #{index + 1}
                </span>

                {/* Player */}
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm truncate text-slate-100">
                    {buzz.playerName}
                  </p>
                  <p className="text-xs font-bold truncate" style={{ color: buzz.teamColor }}>
                    {buzz.teamName}
                  </p>
                </div>

                {/* Team dot */}
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: buzz.teamColor }}
                />

                {/* Active indicator */}
                {isJudging && (
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider shrink-0 bg-emerald-950/80 border border-emerald-700/80 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
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
