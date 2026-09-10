import { motion } from 'framer-motion';

export default function Scoreboard({ teams }) {
  if (!teams || teams.length === 0) return null;

  const maxScore = Math.max(...teams.map((t) => t.score), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="nm-flat p-4 sm:p-5 rounded-3xl"
    >
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        {teams.map((team) => {
          const isLeader = team.score > 0 && team.score === maxScore;

          return (
            <div key={team.name} className="flex-1 min-w-[140px]">
              <div className="flex items-center justify-between gap-1 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="text-xs font-black text-slate-800 truncate">
                    {team.name}
                  </span>
                </div>
                {isLeader && (
                  <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md">
                    👑
                  </span>
                )}
              </div>

              {/* Progress bar track */}
              <div className="relative h-9 bg-slate-100 rounded-xl overflow-hidden border border-slate-200/80">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-xl shadow-xs"
                  style={{
                    background: `linear-gradient(90deg, ${team.color}, ${team.color}dd)`,
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.max((team.score / maxScore) * 100, 10)}%` }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.span
                    key={team.score}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="mono text-sm font-black text-white drop-shadow-sm"
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
