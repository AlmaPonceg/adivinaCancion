import { motion, AnimatePresence } from 'framer-motion';

export default function TeamDisplay({ teams, onMovePlayer }) {
  if (!teams || teams.length === 0) return null;

  return (
    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
      <AnimatePresence>
        {teams.map((team, teamIdx) => (
          <motion.div
            key={team.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: teamIdx * 0.1 }}
            className="nm-flat-sm p-4 rounded-xl border border-white/60"
            style={{
              borderLeft: `4px solid ${team.color}`,
            }}
          >
            {/* Team header */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-black/5">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <span className="font-bold text-sm" style={{ color: team.color }}>
                  {team.name}
                </span>
              </div>
              <span className={`mono text-xs font-semibold px-2 py-0.5 rounded-full ${
                team.players.length >= 4
                  ? 'bg-amber-100 text-amber-800'
                  : 'text-[var(--color-text-muted)]'
              }`}>
                {team.players.length}/4 integrantes
              </span>
            </div>

            {/* Players list */}
            {team.players.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] italic py-2">
                Sin integrantes asignados aún
              </p>
            ) : (
              <div className="space-y-2">
                {team.players.map((player) => (
                  <div
                    key={player.id || player.name}
                    className="nm-inset-sm px-3 py-2 rounded-lg flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: team.color }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                        {player.name}
                      </span>
                      {player.isManual && (
                        <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] bg-black/5 px-1.5 py-0.5 rounded">
                          Manual
                        </span>
                      )}
                    </div>

                    {/* Quick Move to another team selector */}
                    {onMovePlayer && teams.length > 1 && (
                      <div className="flex items-center gap-1 shrink-0">
                        <select
                          value={teamIdx}
                          onChange={(e) => {
                            const targetIdx = Number(e.target.value);
                            if (targetIdx !== teamIdx) {
                              onMovePlayer(player.id, targetIdx);
                            }
                          }}
                          className="text-[11px] font-medium py-1 px-2 rounded-md bg-transparent border-none text-[var(--color-text-secondary)] cursor-pointer focus:outline-none"
                          title="Mover jugador a otro equipo"
                        >
                          {teams.map((t, idx) => (
                            <option
                              key={t.name}
                              value={idx}
                              disabled={idx !== teamIdx && t.players.length >= 4}
                            >
                              {idx === teamIdx ? 'En este equipo' : `Mover a ${t.name} (${t.players.length}/4)`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
