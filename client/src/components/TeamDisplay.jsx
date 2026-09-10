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
            transition={{ delay: teamIdx * 0.08 }}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden"
            style={{
              borderLeft: `5px solid ${team.color}`,
            }}
          >
            {/* Team header */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full shadow-xs"
                  style={{ backgroundColor: team.color }}
                />
                <span className="font-black text-sm text-slate-900">
                  {team.name}
                </span>
              </div>
              <span
                className={`mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  team.players.length >= 4
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {team.players.length}/4 integrantes
              </span>
            </div>

            {/* Players list */}
            {team.players.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Sin integrantes asignados aún
              </p>
            ) : (
              <div className="space-y-2">
                {team.players.map((player) => (
                  <div
                    key={player.id || player.name}
                    className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: team.color }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {player.name}
                      </span>
                      {player.isManual && (
                        <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
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
                          className="text-[11px] font-bold py-1 px-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 cursor-pointer shadow-2xs hover:border-slate-300"
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
