import { motion } from 'framer-motion';

export default function Scoreboard({ teams }) {
  if (!teams || teams.length === 0) return null;

  const maxScore = Math.max(...teams.map((t) => t.score), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="party-card p-4 sm:p-5 rounded-[2rem]"
    >
      <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-1">
        {teams.map((team) => {
          const isLeader = team.score > 0 && team.score === maxScore;

          return (
            <div key={team.name} className="flex-1 min-w-[125px] sm:min-w-[140px]">
              <div className="flex items-center justify-between gap-1 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: team.color, boxShadow: `0 0 8px ${team.color}80` }}
                  />
                  <span className="font-display font-black text-xs text-[#181226] truncate">
                    {team.name}
                  </span>
                </div>
                {isLeader && (
                  <span className="font-tactical text-[10px] font-black text-[#D97706] bg-[#FFFBEB] border border-[#F59E0B]/40 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                    <svg className="w-3 h-3 text-[#D97706]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                    </svg>
                    <span>1º</span>
                  </span>
                )}
              </div>

              {/* Progress bar track */}
              <div className="relative h-9 bg-[#FAF7F2] rounded-xl overflow-hidden border border-[#EAE3D5] shadow-inner">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-xl"
                  style={{
                    background: `linear-gradient(90deg, ${team.color}, ${team.color}dd)`,
                    boxShadow: `0 0 12px ${team.color}60`,
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.max((team.score / maxScore) * 100, 12)}%` }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <motion.span
                    key={team.score}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="mono text-sm font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                  >
                    {team.score} {team.score === 1 ? 'pt' : 'pts'}
                  </motion.span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
