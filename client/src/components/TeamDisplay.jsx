import { motion, AnimatePresence } from 'framer-motion';

export default function TeamDisplay({ teams }) {
  if (!teams || teams.length === 0) return null;

  return (
    <div className="space-y-3 max-h-72 overflow-y-auto">
      <AnimatePresence>
        {teams.map((team, teamIdx) => (
          <motion.div
            key={team.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: teamIdx * 0.12 }}
            className="rounded-lg overflow-hidden"
            style={{
              background: `${team.color}08`,
              border: `1px solid ${team.color}25`,
            }}
          >
            <div
              className="px-4 py-2.5 flex items-center gap-2"
              style={{ borderBottom: `1px solid ${team.color}15` }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: team.color }}
              />
              <span className="font-semibold text-sm" style={{ color: team.color }}>
                {team.name}
              </span>
              <span className="mono text-[10px] text-[var(--color-text-muted)] ml-auto">
                {team.players.length}
              </span>
            </div>
            <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
              {team.players.map((player, i) => (
                <motion.span
                  key={player.id || player.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: teamIdx * 0.12 + i * 0.06 }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5
                             bg-[var(--color-bg-elevated)] rounded-md text-xs font-medium"
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white/90"
                    style={{ backgroundColor: `${team.color}90` }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                  {player.name}
                </motion.span>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
