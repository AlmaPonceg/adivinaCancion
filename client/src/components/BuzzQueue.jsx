import { motion, AnimatePresence } from 'framer-motion';

export default function BuzzQueue({ queue, currentJudging }) {
  if (!queue || queue.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="nm-flat p-5 sm:p-6 rounded-3xl"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-black uppercase tracking-wider text-slate-700">
          Orden de Pulsadores
        </p>
        <span className="mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
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
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                    : 'border-slate-200/80 bg-slate-50'
                }`}
              >
                {/* Position */}
                <span
                  className={`mono text-xs font-black w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    index === 0
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  #{index + 1}
                </span>

                {/* Player */}
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm truncate text-slate-900">
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
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider shrink-0 bg-emerald-100 border border-emerald-300/60 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
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
