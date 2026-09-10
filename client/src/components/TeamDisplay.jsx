import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeamDisplay({ teams, onMovePlayer, onRenameTeam }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editName, setEditName] = useState('');

  if (!teams || teams.length === 0) return null;

  const startEdit = (idx, currentName) => {
    setEditingIdx(idx);
    setEditName(currentName);
  };

  const saveEdit = (idx) => {
    if (editName.trim() && onRenameTeam) {
      onRenameTeam(idx, editName.trim());
    }
    setEditingIdx(null);
  };

  return (
    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
      <AnimatePresence>
        {teams.map((team, teamIdx) => (
          <motion.div
            key={team.color || teamIdx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: teamIdx * 0.08 }}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden"
            style={{
              borderLeft: `5px solid ${team.color}`,
            }}
          >
            {/* Team header with editable name */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                <div
                  className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0"
                  style={{ backgroundColor: team.color }}
                />
                {editingIdx === teamIdx ? (
                  <div className="flex items-center gap-1.5 flex-1 max-w-[240px]">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => saveEdit(teamIdx)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(teamIdx)}
                      autoFocus
                      maxLength={24}
                      className="text-xs font-black px-2.5 py-1 rounded-lg border border-indigo-400 bg-indigo-50/50 text-slate-900 w-full"
                      placeholder="Nombre del equipo"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        saveEdit(teamIdx);
                      }}
                      className="p-1 rounded-md bg-indigo-600 text-white shrink-0 cursor-pointer"
                      title="Guardar nombre"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => startEdit(teamIdx, team.name)}
                    className="flex items-center gap-1.5 cursor-pointer group truncate"
                    title="Hacé clic para cambiar el nombre del equipo"
                  >
                    <span className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {team.name}
                    </span>
                    <svg
                      className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {team.isReady ? (
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                    <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    ¡Listo!
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    Esperando listo
                  </span>
                )}

                <span
                  className={`mono text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                    team.players.length >= 4
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {team.players.length}/4
                </span>
              </div>
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
