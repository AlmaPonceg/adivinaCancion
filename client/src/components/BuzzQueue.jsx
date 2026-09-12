import { motion, AnimatePresence } from 'framer-motion';

export default function BuzzQueue({ queue, currentJudging }) {
  if (!queue || queue.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="party-card p-5 sm:p-6 rounded-[2rem]"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="badge-tag text-[#6B6280]">
          Orden de Pulsadores
        </p>
        <span className="mono text-xs font-black text-[#FF5722] bg-[#FFF0EB] border border-[#FF5722]/30 px-2.5 py-0.5 rounded-lg">
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
                    ? 'border-[#059669] bg-[#E6F9F0] shadow-sm ring-1 ring-[#059669]/30'
                    : 'border-[#EAE3D5] bg-[#FAF7F2]'
                }`}
              >
                {/* Position */}
                <span
                  className={`mono text-xs font-black w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    index === 0
                      ? 'bg-[#FF5722] text-white shadow-xs'
                      : 'bg-white border border-[#EAE3D5] text-[#181226]'
                  }`}
                >
                  #{index + 1}
                </span>

                {/* Player */}
                <div className="flex-1 min-w-0">
                  <p className="font-display font-black text-sm truncate text-[#181226]">
                    {buzz.playerName}
                  </p>
                  <p className="text-xs font-bold truncate" style={{ color: buzz.teamColor }}>
                    {buzz.teamName}
                  </p>
                </div>

                {/* Team dot */}
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: buzz.teamColor, boxShadow: `0 0 8px ${buzz.teamColor}80` }}
                />

                {/* Reaction time and points badge */}
                {buzz.elapsedSeconds !== undefined && (
                  <span className="mono text-[10px] font-bold text-[#6B6280] bg-white border border-[#EAE3D5] px-2 py-0.5 rounded-lg shrink-0 shadow-2xs">
                    {buzz.elapsedSeconds}s{' '}
                    <span className="text-[#059669] font-black">
                      (+{buzz.suggestedPoints || 1}pt{buzz.suggestedPoints > 1 ? 's' : ''})
                    </span>
                  </span>
                )}

                {/* Active indicator */}
                {isJudging && (
                  <span className="font-tactical text-[10px] font-black text-[#059669] uppercase tracking-wider shrink-0 bg-[#E6F9F0] border border-[#059669]/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                    En turno
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
