import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeamDisplay({
  teams,
  onMovePlayer,
  onRenameTeam,
  onRemoveTeam,
  maxPlayersPerTeam = 4,
  isIndividual = false,
}) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editName, setEditName] = useState('');

  if (!teams || teams.length === 0) return null;

  const hasLimit = !isIndividual && typeof maxPlayersPerTeam === 'number' && maxPlayersPerTeam > 0;

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-1">
      <AnimatePresence>
        {teams.map((team, teamIdx) => (
          <motion.div
            key={team.name || teamIdx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(teamIdx * 0.03, 0.25) }}
            className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] shadow-xs relative overflow-hidden"
            style={{
              borderLeft: `5px solid ${team.color}`,
            }}
          >
            {/* Team header with editable name */}
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#EAE3D5]">
              <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                <div
                  className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0"
                  style={{ backgroundColor: team.color, boxShadow: `0 0 10px ${team.color}80` }}
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
                      className="text-xs font-black px-2.5 py-1 rounded-xl border border-[#FF5722] bg-white text-[#181226] w-full"
                      placeholder="Nombre del equipo"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        saveEdit(teamIdx);
                      }}
                      className="arcade-btn-primary p-1.5 rounded-lg text-white shrink-0 cursor-pointer"
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
                    <span className="font-bold text-sm text-[#181226] group-hover:text-[#FF5722] transition-colors truncate">
                      {team.name}
                    </span>
                    <svg
                      className="w-3.5 h-3.5 text-[#6B6280] group-hover:text-[#FF5722] transition-colors shrink-0"
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
                  <span className="badge-tag px-2.5 py-1 rounded-lg bg-[#E6F9F0] text-[#059669] border border-[#059669]/30 flex items-center gap-1 shadow-2xs">
                    <svg className="w-3 h-3 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    ¡Listo!
                  </span>
                ) : (
                  <span className="badge-tag px-2.5 py-1 rounded-lg bg-white text-[#6B6280] border border-[#EAE3D5] flex items-center gap-1.5">
                    En espera
                  </span>
                )}

                {isIndividual ? (
                  <span className="mono text-xs font-black px-2.5 py-1 rounded-lg bg-[#FDF4FF] border border-[#F5D0FE] text-[#86198F] shrink-0 shadow-2xs">
                    1 vs Todos
                  </span>
                ) : (
                  <span
                    className={`mono text-xs font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
                      hasLimit && team.players.length >= maxPlayersPerTeam
                        ? 'bg-[#FFF0EB] text-[#FF5722] border-[#FF5722]/30'
                        : 'bg-white border-[#EAE3D5] text-[#6B6280]'
                    }`}
                  >
                    {team.players.length}{hasLimit ? `/${maxPlayersPerTeam}` : ' jug.'}
                  </span>
                )}

                {!isIndividual && onRemoveTeam && teams.length > 2 && (
                  <button
                    type="button"
                    onClick={() => onRemoveTeam(teamIdx)}
                    className="p-1 rounded-lg text-[#A098AE] hover:text-[#E11D48] hover:bg-[#FFF0F3] transition-colors cursor-pointer"
                    title={`Eliminar ${team.name}`}
                    aria-label={`Eliminar ${team.name}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Players list */}
            {team.players.length === 0 ? (
              <p className="text-xs text-[#8E869E] italic py-2">
                Sin integrantes asignados aún
              </p>
            ) : (
              <div className="space-y-2">
                {team.players.map((player) => (
                  <div
                    key={player.id || player.name}
                    className="p-2.5 rounded-xl bg-white border border-[#EAE3D5] flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: team.color }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-[#181226] truncate">
                        {player.name}
                      </span>
                      {player.isManual && (
                        <span className="text-[10px] uppercase font-bold text-[#FF5722] bg-[#FFF0EB] px-1.5 py-0.5 rounded border border-[#FF5722]/30">
                          Manual
                        </span>
                      )}
                    </div>

                    {/* Quick Move to another team selector */}
                    {!isIndividual && onMovePlayer && teams.length > 1 && (
                      <div className="flex items-center gap-1 shrink-0">
                        <select
                          value={teamIdx}
                          onChange={(e) => {
                            const targetIdx = Number(e.target.value);
                            if (targetIdx !== teamIdx) {
                              onMovePlayer(player.id, targetIdx);
                            }
                          }}
                          className="text-[11px] font-bold py-1 px-2.5 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-[#181226] cursor-pointer shadow-2xs hover:border-[#FF5722]/50"
                          title="Mover jugador a otro equipo"
                        >
                          {teams.map((t, idx) => {
                            const isTargetFull = hasLimit && idx !== teamIdx && t.players.length >= maxPlayersPerTeam;
                            return (
                              <option
                                key={t.name}
                                value={idx}
                                disabled={isTargetFull}
                              >
                                {idx === teamIdx
                                  ? 'En este equipo'
                                  : `Mover a ${t.name} (${t.players.length}${hasLimit ? `/${maxPlayersPerTeam}` : ''})`}
                              </option>
                            );
                          })}
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
