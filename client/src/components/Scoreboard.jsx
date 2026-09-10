import { motion } from 'framer-motion';

export default function Scoreboard({ teams }) {
  if (!teams || teams.length === 0) return null;

  const maxScore = Math.max(...teams.map((t) => t.score), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="nm-flat p-4 sm:p-5 rounded-2xl"
    >
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        {teams.map((team) => (
          <div key={team.name} className="flex-1 min-w-[130px]">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: team.color }}
              />
              <span className="text-xs font-bold text-[var(--color-text-secondary)] truncate">
                {team.name}
              </span>
            </div>

            {/* Neumorphic sunken bar track */}
            <div className="relative h-9 nm-inset rounded-lg overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-lg"
                style={{
                  background: `linear-gradient(90deg, ${team.color}90, ${team.color})`,
                  boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
                }}
                initial={{ width: '0%' }}
                animate={{ width: `${Math.max((team.score / maxScore) * 100, 8)}%` }}
                transition={{ type: 'spring', damping: 18, stiffness: 90 }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  key={team.score}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="mono text-sm sm:text-base font-extrabold text-white drop-shadow-md"
                >
                  {team.score}
                </motion.span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
