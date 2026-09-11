import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';
import { useSocketEvent } from '../hooks/useSocket';
import BuzzerButton from '../components/BuzzerButton';

function computeStatusMessage(st) {
  if (!st) return 'Conectando al juego...';
  if (st.canBuzz) return '¡MÚSICA SONANDO! TOCÁ EL BOTÓN';
  if (st.isMyTurn) return '¡TU TURNO! CANTÁ O RESPONDÉ';
  if (st.hasBuzzed) return 'Registrado. Esperando al jurado...';
  if (st.isTeamBlocked) return 'Tu equipo fue bloqueado esta ronda';
  if (st.isPlayerBlocked) return 'Bloqueado en esta ronda';
  if (st.gameState === 'BUZZER_LOCKED') {
    const judging = st.currentJudging;
    return judging ? `${judging.playerName} (${judging.teamName}) tocó primero` : 'Alguien fue más rápido';
  }
  if (st.gameState === 'ROUND_END') return 'Ronda finalizada. Esperando siguiente canción...';
  if (st.gameState === 'ROUND_ACTIVE') return '¡MÚSICA SONANDO! TOCÁ EL BOTÓN';
  if (st.teamName) return `En ${st.teamName} · Esperando que el Host lance la canción...`;
  return 'Esperando que el Host sortee los equipos e inicie la canción...';
}

export default function PlayerBuzzer() {
  const location = useLocation();
  const navigate = useNavigate();

  // Load identity from route state or fallback to localStorage
  const savedSession = (() => {
    try {
      const item = localStorage.getItem('trivia_player_session');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  })();

  const roomCode = location.state?.roomCode || savedSession?.roomCode || '';
  const playerName = location.state?.playerName || savedSession?.playerName || '';
  const playerId =
    location.state?.playerId || savedSession?.playerId || localStorage.getItem('trivia_player_id') || '';

  const [playerState, setPlayerState] = useState({
    teamName: location.state?.teamName || savedSession?.teamName || '',
    teamColor: location.state?.teamColor || savedSession?.teamColor || '#4F46E5',
    teamBg: '#F8FAFC',
    canBuzz: false,
    hasBuzzed: false,
    isTeamBlocked: false,
    isPlayerBlocked: false,
    isMyTurn: false,
    gameState: 'TEAMS_ASSIGNED',
    roundNumber: 1,
    teams: [],
  });

  const [statusMessage, setStatusMessage] = useState(() => computeStatusMessage(playerState));
  const [buzzPosition, setBuzzPosition] = useState(null);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [roundNotification, setRoundNotification] = useState(null);

  // ── Team Setup & Readiness State (Phone) ───────────────────
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [customTeamName, setCustomTeamName] = useState('');

  const myTeam =
    playerState.teams && playerState.teamIndex >= 0
      ? playerState.teams[playerState.teamIndex]
      : playerState.teams?.find((t) =>
          t.players?.some(
            (p) => p.id === playerId || (p.name && p.name.toLowerCase() === playerName.toLowerCase())
          )
        );

  const handleSaveTeamName = () => {
    if (!customTeamName.trim()) return;
    const teamIdx =
      playerState.teamIndex >= 0
        ? playerState.teamIndex
        : playerState.teams?.indexOf(myTeam);
    socket.emit('rename-team', {
      roomCode,
      teamIndex: teamIdx,
      newName: customTeamName.trim(),
      playerId,
    });
    setIsEditingTeamName(false);
  };

  const handleToggleReady = () => {
    const nextReady = !myTeam?.isReady;
    const teamIdx =
      playerState.teamIndex >= 0
        ? playerState.teamIndex
        : playerState.teams?.indexOf(myTeam);
    socket.emit('team-ready', {
      roomCode,
      teamIndex: teamIdx,
      isReady: nextReady,
      playerId,
    });
  };

  // ── Sync & Reconnection on Unlock / Visibility Change ──────
  useEffect(() => {
    if (!roomCode || !playerId) {
      navigate('/play');
      return;
    }

    const syncSession = () => {
      socket.emit('reconnect-player', { roomCode, playerId, playerName }, (res) => {
        if (res?.success && res.playerState) {
          setPlayerState(res.playerState);
          setStatusMessage(computeStatusMessage(res.playerState));
        } else {
          // Fallback if reconnect didn't find player (e.g. server restart)
          socket.emit('join-room', { roomCode, playerName, playerId }, (joinRes) => {
            if (joinRes?.playerState) {
              setPlayerState(joinRes.playerState);
              setStatusMessage(computeStatusMessage(joinRes.playerState));
            } else {
              socket.emit('get-player-state', { roomCode, playerId }, (st) => {
                if (st && !st.error) {
                  setPlayerState(st);
                  setStatusMessage(computeStatusMessage(st));
                }
              });
            }
          });
        }
      });
    };

    // Run immediately
    syncSession();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    socket.on('connect', syncSession);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.off('connect', syncSession);
    };
  }, [roomCode, playerId, playerName, navigate]);

  // ── Sockets Listeners ──────────────────────────────────────

  // Round started -> Immediately activate buzzer!
  useSocketEvent('round-started', (data) => {
    setShowTeamsModal(false);
    setPlayerState((prev) => ({
      ...prev,
      canBuzz: true,
      hasBuzzed: false,
      isTeamBlocked: false,
      isPlayerBlocked: false,
      isMyTurn: false,
      gameState: 'ROUND_ACTIVE',
      roundNumber: data?.roundNumber || prev.roundNumber + 1,
    }));
    setStatusMessage('¡MÚSICA SONANDO! TOCÁ EL BOTÓN');
    setBuzzPosition(null);
    setRoundNotification({
      type: 'start',
      message: `Ronda ${data?.roundNumber || ''} en juego`,
    });
    setTimeout(() => setRoundNotification(null), 2500);
  });

  useSocketEvent('buzzers-enabled', () => {
    setShowTeamsModal(false);
    setPlayerState((prev) => ({
      ...prev,
      canBuzz: true,
      hasBuzzed: false,
      isTeamBlocked: false,
      isPlayerBlocked: false,
      gameState: 'ROUND_ACTIVE',
    }));
    setStatusMessage('¡MÚSICA SONANDO! TOCÁ EL BOTÓN');
    setBuzzPosition(null);
  });

  useSocketEvent('player-state-updated', (state) => {
    if (!state) return;
    if (state.gameState === 'ROUND_ACTIVE' || state.canBuzz) {
      setShowTeamsModal(false);
    }
    setPlayerState(state);
    setStatusMessage(computeStatusMessage(state));

    try {
      const saved = localStorage.getItem('trivia_player_session');
      if (saved) {
        const s = JSON.parse(saved);
        s.teamName = state.teamName;
        s.teamIndex = state.teamIndex;
        s.teamColor = state.teamColor;
        localStorage.setItem('trivia_player_session', JSON.stringify(s));
      }
    } catch {
      /* */
    }
  });

  useSocketEvent('your-team', (state) => {
    if (!state) return;
    setPlayerState((prev) => {
      const updated = {
        ...prev,
        teamName: state.teamName || prev.teamName,
        teamColor: state.teamColor || prev.teamColor,
        teamBg: state.teamBg || prev.teamBg,
        teamIndex: state.teamIndex ?? prev.teamIndex,
        teams: state.teams || prev.teams,
      };
      setStatusMessage(computeStatusMessage(updated));
      return updated;
    });

    try {
      const saved = localStorage.getItem('trivia_player_session');
      if (saved) {
        const s = JSON.parse(saved);
        s.teamName = state.teamName;
        s.teamIndex = state.teamIndex;
        s.teamColor = state.teamColor;
        localStorage.setItem('trivia_player_session', JSON.stringify(s));
      }
    } catch {
      /* */
    }
  });

  useSocketEvent('teams-assigned', (data) => {
    if (data?.teams) {
      setPlayerState((prev) => {
        let teamName = prev.teamName;
        let teamColor = prev.teamColor;
        let teamBg = prev.teamBg;
        let teamIndex = prev.teamIndex;

        data.teams.forEach((t, idx) => {
          const found = t.players?.find(
            (p) => p.id === playerId || (p.name && p.name.toLowerCase() === playerName.toLowerCase())
          );
          if (found) {
            teamName = t.name;
            teamColor = t.color;
            teamBg = t.bg;
            teamIndex = idx;
          }
        });

        const updated = {
          ...prev,
          teams: data.teams,
          teamName,
          teamColor,
          teamBg,
          teamIndex,
        };
        setStatusMessage(computeStatusMessage(updated));
        return updated;
      });
    }
  });

  useSocketEvent('game-started', (data) => {
    setShowTeamsModal(false);
    setPlayerState((prev) => ({
      ...prev,
      teams: data?.teams || prev.teams,
      roundNumber: data?.roundNumber || prev.roundNumber,
      gameState: 'ROUND_WAITING',
    }));
    setStatusMessage('Partida iniciada. Esperando que el anfitrión lance la música...');
  });

  useSocketEvent('first-buzz', (data) => {
    const entry = data?.buzzEntry;
    if (entry && entry.playerId !== playerId) {
      setRoundNotification({
        type: 'buzz',
        message: `${entry.playerName} (${entry.teamName}) pulsó primero`,
      });
      setTimeout(() => setRoundNotification(null), 3500);
    }
  });

  useSocketEvent('round-result', (data) => {
    setStatusMessage('Ronda finalizada. Esperando siguiente canción...');
    if (data.type === 'correct') {
      const pts = data.pointsAwarded || 1;
      const speedTxt = data.elapsedSeconds !== undefined ? ` (${data.elapsedSeconds}s)` : '';
      setRoundNotification({
        type: 'correct',
        message: `+${pts} ${pts === 1 ? 'pt' : 'pts'} para ${data.teamName} (${data.playerName})${speedTxt}`,
      });
    }

    if (data.scores) {
      setPlayerState((prev) => {
        const updatedTeams = [...(prev.teams || [])];
        data.scores.forEach((s, i) => {
          if (updatedTeams[i]) updatedTeams[i] = { ...updatedTeams[i], score: s.score };
        });
        return {
          ...prev,
          teams: updatedTeams,
          canBuzz: false,
          hasBuzzed: false,
          gameState: 'ROUND_END',
        };
      });
    } else {
      setPlayerState((prev) => ({
        ...prev,
        canBuzz: false,
        hasBuzzed: false,
        gameState: 'ROUND_END',
      }));
    }

    // Mostrar automáticamente la tabla de posiciones en los celulares al terminar la ronda
    setShowTeamsModal(true);
    setTimeout(() => setShowTeamsModal(false), 5000);
    setTimeout(() => setRoundNotification(null), 4000);
  });

  useSocketEvent('round-judgment', (data) => {
    if (data.allBlocked) {
      setRoundNotification({
        type: 'incorrect',
        message: 'Todos los equipos fallaron esta ronda',
      });
      setPlayerState((prev) => ({
        ...prev,
        canBuzz: false,
        hasBuzzed: false,
        gameState: 'ROUND_END',
      }));
      // Mostrar automáticamente la tabla de posiciones si todos fallaron
      setShowTeamsModal(true);
    } else if (data.reopened) {
      setRoundNotification({
        type: 'incorrect',
        message: `Falló ${data.blocked?.playerName}. Pulsador reabierto`,
      });
      setPlayerState((prev) => ({
        ...prev,
        canBuzz: !prev.isTeamBlocked && !prev.isPlayerBlocked,
        hasBuzzed: false,
      }));
      setStatusMessage('¡Buzzer reabierto! Tocá el botón');
    }
    setTimeout(() => setRoundNotification(null), 3500);
  });

  useSocketEvent('game-over', (data) => {
    navigate('/gameover', { state: { rankings: data.rankings } });
  });

  useSocketEvent('host-disconnected', () => {
    setRoundNotification({
      type: 'warning',
      message: 'Anfitrión desconectado momentáneamente...',
    });
  });

  // ── Buzz Action ────────────────────────────────────────────
  const handleBuzz = useCallback(() => {
    if (!playerState.canBuzz) return;

    socket.emit('buzz', { roomCode }, (response) => {
      if (response?.success) {
        setBuzzPosition(response.position);
        setStatusMessage(
          response.position === 1 ? '¡Tocaste primero! Tu turno' : `#${response.position} en la cola`
        );
      }
    });
  }, [playerState.canBuzz, roomCode]);

  if (!roomCode) return null;

  return (
    <div className="min-h-dvh flex flex-col justify-between p-4 select-none bg-[var(--color-console-bg)] text-[var(--color-text-on-dark)]">
      {/* ── TOP BAR: Room, Round & Standings HUD ── */}
      <header className="w-full pt-1">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="mono text-xs font-black tracking-wider text-slate-200">
                SALA {roomCode}
              </span>
            </div>
            {playerState.roundNumber > 0 && (
              <div className="mono text-xs font-black px-3 py-1.5 rounded-xl bg-indigo-950/70 text-indigo-300 border border-indigo-700/60 shadow-xs">
                RONDA {playerState.roundNumber}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowTeamsModal(true)}
            className="console-btn text-xs font-bold px-3 py-1.5 rounded-xl text-slate-200 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
          >
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Posiciones
          </button>
        </div>

        {/* Live Scoreboard ticker */}
        {playerState.teams && playerState.teams.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {playerState.teams.map((t) => (
              <div
                key={t.name}
                className="bg-slate-900/90 border border-slate-800 shadow-xs flex items-center gap-2 px-3 py-1.5 rounded-xl shrink-0"
                style={{ borderLeft: `3.5px solid ${t.color}` }}
              >
                <span className="text-xs font-bold text-slate-200 truncate max-w-[95px]">
                  {t.name}
                </span>
                <span className="mono text-xs font-black text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                  {t.score}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Notification Toast */}
        <AnimatePresence>
          {roundNotification && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-2.5 py-2 px-3.5 rounded-xl text-center text-xs font-extrabold bg-slate-900 text-white shadow-md border border-[var(--color-neon-indigo)]/50"
            >
              {roundNotification.message}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── MIDDLE: Player info & Circular Arcade Buzzer OR Team Setup Card ── */}
      {playerState.gameState === 'TEAMS_ASSIGNED' && (!playerState.roundNumber || playerState.roundNumber === 0) ? (
        playerState.teamName ? (
          <div className="flex flex-col items-center justify-center my-auto py-2 w-full max-w-sm mx-auto">
            {/* Team Confirmation & Setup Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full bg-slate-900/90 rounded-3xl p-6 shadow-2xl border-2 relative overflow-hidden backdrop-blur-sm"
              style={{ borderColor: playerState.teamColor || '#4F46E5' }}
            >
              {/* Color accent header strip */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5 opacity-90"
                style={{ backgroundColor: playerState.teamColor || '#4F46E5' }}
              />

              <div className="text-center mb-5 pt-1">
                <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-1">
                  SORTEO DE EQUIPOS
                </p>
                <h3 className="text-lg font-black text-slate-100">
                  Tu equipo asignado
                </h3>
              </div>

              {/* Editable Team Name */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 mb-4 text-center shadow-inner">
                {isEditingTeamName ? (
                  <div className="space-y-2.5">
                    <p className="text-xs font-bold text-slate-300">Nuevo nombre del equipo:</p>
                    <input
                      type="text"
                      value={customTeamName}
                      onChange={(e) => setCustomTeamName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveTeamName()}
                      maxLength={25}
                      autoFocus
                      placeholder="Ej. Los Campeones"
                      className="w-full px-3 py-2 text-sm font-black rounded-xl border-2 border-indigo-500 text-center bg-slate-900 text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditingTeamName(false)}
                        className="flex-1 py-2 text-xs font-bold text-slate-400 hover:text-slate-200"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveTeamName}
                        className="flex-1 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3
                      className="text-2xl font-black mb-1.5 break-words tracking-tight"
                      style={{ color: playerState.teamColor || '#4F46E5' }}
                    >
                      {myTeam?.name || playerState.teamName}
                    </h3>
                    <button
                      onClick={() => {
                        setCustomTeamName(myTeam?.name || playerState.teamName);
                        setIsEditingTeamName(true);
                      }}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1.5 cursor-pointer mt-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Cambiar nombre del equipo
                    </button>
                  </div>
                )}
              </div>

              {/* Teammates */}
              <div className="mb-5">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 text-center">
                  Integrantes ({myTeam?.players?.length || 1}/4):
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {myTeam?.players?.map((p) => {
                    const pName = p.name || p;
                    const isMe = pName.toLowerCase() === playerName.toLowerCase();
                    return (
                      <span
                        key={p.id || pName}
                        className={`text-xs px-3 py-1 rounded-lg font-bold border transition-colors ${
                          isMe
                            ? 'bg-indigo-600 text-white font-black border-indigo-400 shadow-xs'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        {pName} {isMe ? '(Vos)' : ''}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Ready Button */}
              {myTeam?.isReady ? (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border-2 border-emerald-500 text-center shadow-md">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-sm mb-1">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    ¡Tu equipo está LISTO!
                  </div>
                  <p className="text-xs text-emerald-300/80 font-medium">
                    Esperando que los demás equipos confirmen para iniciar...
                  </p>
                  <button
                    onClick={handleToggleReady}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-200 underline mt-2.5 cursor-pointer block mx-auto"
                  >
                    Desmarcar o cambiar nombre
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    onClick={handleToggleReady}
                    className="w-full py-4 px-6 rounded-2xl font-black text-base bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    ¡Estamos Listos!
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2 font-medium">
                    Con que 1 integrante toque este botón, tu equipo ya queda confirmado.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="text-center my-auto p-6 max-w-sm mx-auto">
            <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 animate-ping" />
              <div className="relative w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-lg text-indigo-400">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-100 mb-1.5 tracking-tight">¡Estás en la partida!</h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Esperando que el anfitrión sortee los equipos en la pantalla principal para asignarte...
            </p>
          </div>
        )
      ) : (
        <div className="relative flex flex-col items-center justify-center my-auto py-2 w-full">
          {/* Ambient reactive back-glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 ease-out -z-0"
            style={{
              backgroundColor: playerState.isMyTurn
                ? '#10B981'
                : playerState.canBuzz
                ? (playerState.teamColor || '#6366F1')
                : 'transparent',
              opacity: playerState.isMyTurn ? 0.35 : playerState.canBuzz ? 0.22 : 0,
              transform: playerState.canBuzz || playerState.isMyTurn ? 'translate(-50%, -50%) scale(1.15)' : 'translate(-50%, -50%) scale(0.8)',
            }}
          />

          {/* Player Gamer Profile Card */}
          <div className="flex flex-col items-center mb-5 z-10">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md backdrop-blur-xs">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-inner"
                style={{
                  backgroundColor: playerState.teamColor || '#4F46E5',
                  boxShadow: `0 0 12px ${playerState.teamColor || '#4F46E5'}60`,
                }}
              >
                {playerName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <span className="block text-sm font-black text-slate-100 leading-tight">
                  {playerName}
                </span>
                <span
                  className="block text-[10px] font-extrabold uppercase tracking-wider leading-none mt-0.5"
                  style={{ color: playerState.teamColor || '#94A3B8' }}
                >
                  {playerState.teamName || 'Individual'}
                </span>
              </div>
            </div>
          </div>

          {/* 3D Arcade Buzzer */}
          <div className="z-10">
            <BuzzerButton
              onBuzz={handleBuzz}
              canBuzz={playerState.canBuzz}
              hasBuzzed={playerState.hasBuzzed}
              isBlocked={playerState.isTeamBlocked || playerState.isPlayerBlocked}
              teamColor={playerState.teamColor}
              isMyTurn={playerState.isMyTurn}
            />
          </div>

          {/* Tactical Status HUD */}
          <motion.div
            key={statusMessage}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mt-6 text-center px-4 w-full max-w-xs z-10"
          >
            <div
              className={`py-3 px-4 rounded-2xl border font-black text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 ${
                playerState.isMyTurn
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-emerald-900/40 ring-2 ring-emerald-500/30'
                  : playerState.canBuzz
                  ? 'bg-indigo-950/90 border-indigo-400/80 text-indigo-100 animate-pulse shadow-indigo-950/60 ring-2 ring-indigo-500/30'
                  : playerState.hasBuzzed
                  ? 'bg-slate-900/90 border-slate-700 text-slate-200'
                  : playerState.isTeamBlocked || playerState.isPlayerBlocked
                  ? 'bg-rose-950/80 border-rose-700/80 text-rose-300'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400'
              }`}
            >
              {playerState.isMyTurn ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              ) : playerState.canBuzz ? (
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping shrink-0" />
              ) : null}
              <span>{statusMessage}</span>
            </div>

            {buzzPosition && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 mono text-xs font-black shadow-xs">
                <span>PUESTO EN LA COLA:</span>
                <span className="text-indigo-400 font-black">#{buzzPosition}</span>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="text-center pb-2">
        <p className="text-[11px] text-slate-400 font-medium">
          Mantené tu pantalla activa para pulsar en el milisegundo exacto
        </p>
      </footer>

      {/* ── TEAMS & SCOREBOARD MODAL ── */}
      <AnimatePresence>
        {showTeamsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
            onClick={() => setShowTeamsModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="w-full max-w-md bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 text-slate-100 max-h-[82vh] flex flex-col shadow-2xl border border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-100 tracking-tight">Tabla de Posiciones</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Sala {roomCode} · Ronda {playerState.roundNumber || 1}
                  </p>
                </div>
                <button
                  onClick={() => setShowTeamsModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-black cursor-pointer transition-colors"
                  aria-label="Cerrar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Team list */}
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {playerState.teams && playerState.teams.length > 0 ? (
                  playerState.teams.map((t, idx) => (
                    <div
                      key={t.name}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-sm"
                      style={{ borderLeft: `4.5px solid ${t.color}` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="mono text-xs font-black text-slate-400">
                            #{idx + 1}
                          </span>
                          <span className="font-black text-sm text-slate-100">
                            {t.name}
                          </span>
                        </div>
                        <span className="mono text-sm font-black text-indigo-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                          {t.score} {t.score === 1 ? 'pt' : 'pts'}
                        </span>
                      </div>

                      {/* Members */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {t.players && t.players.length > 0 ? (
                          t.players.map((p) => {
                            const pName = p.name || p;
                            const isMe = pName.toLowerCase() === playerName.toLowerCase();
                            return (
                              <span
                                key={p.id || pName}
                                className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                                  isMe
                                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-xs font-black'
                                    : 'bg-slate-900 border-slate-800 text-slate-300'
                                }`}
                              >
                                {pName} {isMe ? '(Vos)' : ''}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            Sin integrantes
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-sm text-slate-500">
                    No hay equipos asignados aún.
                  </p>
                )}
              </div>

              <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <p className="text-[11px] font-semibold text-slate-400">
                  El pulsador aparecerá automáticamente en tu pantalla cuando el anfitrión inicie la ronda.
                </p>
              </div>

              <button
                onClick={() => setShowTeamsModal(false)}
                className="console-btn-primary w-full mt-3 py-3 rounded-2xl text-xs font-black cursor-pointer shadow-lg active:scale-98 transition-transform"
              >
                Volver al Pulsador
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
