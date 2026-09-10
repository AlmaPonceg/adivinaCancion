import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';
import { useSocketEvent } from '../hooks/useSocket';
import BuzzerButton from '../components/BuzzerButton';

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

  const roomCode = location.state?.roomCode || savedSession?.roomCode;
  const playerName = location.state?.playerName || savedSession?.playerName;
  const playerId = location.state?.playerId || savedSession?.playerId;

  const [playerState, setPlayerState] = useState({
    teamName: savedSession?.teamName || '',
    teamColor: '#4F46E5',
    teamBg: '#F8FAFC',
    canBuzz: false,
    hasBuzzed: false,
    isTeamBlocked: false,
    isPlayerBlocked: false,
    isMyTurn: false,
    gameState: 'ROUND_ACTIVE',
    roundNumber: 1,
    teams: [],
  });

  const [statusMessage, setStatusMessage] = useState('Esperando inicio de ronda...');
  const [buzzPosition, setBuzzPosition] = useState(null);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [roundNotification, setRoundNotification] = useState(null);

  // ── Reconnection on Screen Unlock / Tab Visibility ──────────
  useEffect(() => {
    if (!roomCode || !playerId) {
      navigate('/play');
      return;
    }

    const restoreSession = () => {
      socket.emit('reconnect-player', { roomCode, playerId, playerName }, (res) => {
        if (res?.success && res.playerState) {
          setPlayerState(res.playerState);
        }
      });
    };

    restoreSession();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        restoreSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    socket.on('connect', restoreSession);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.off('connect', restoreSession);
    };
  }, [roomCode, playerId, playerName, navigate]);

  useSocketEvent('player-state-updated', (state) => {
    setPlayerState(state);

    try {
      const saved = localStorage.getItem('trivia_player_session');
      if (saved) {
        const s = JSON.parse(saved);
        s.teamName = state.teamName;
        s.teamIndex = state.teamIndex;
        localStorage.setItem('trivia_player_session', JSON.stringify(s));
      }
    } catch {
      /* */
    }

    if (state.canBuzz) {
      setStatusMessage('¡MÚSICA SONANDO! TOCÁ EL BOTÓN');
      setBuzzPosition(null);
    } else if (state.isMyTurn) {
      setStatusMessage('¡TU TURNO! CANTÁ O RESPONDÉ');
    } else if (state.hasBuzzed) {
      setStatusMessage('Registrado. Esperando al jurado...');
    } else if (state.isTeamBlocked) {
      setStatusMessage('Tu equipo fue bloqueado esta ronda');
    } else if (state.isPlayerBlocked) {
      setStatusMessage('Bloqueado en esta ronda');
    } else if (state.gameState === 'BUZZER_LOCKED') {
      const judging = state.currentJudging;
      if (judging) {
        setStatusMessage(`${judging.playerName} (${judging.teamName}) tocó primero`);
      } else {
        setStatusMessage('Alguien fue más rápido');
      }
    } else if (state.gameState === 'ROUND_END') {
      setStatusMessage('Ronda finalizada');
    } else if (state.gameState === 'TEAMS_ASSIGNED') {
      setStatusMessage('Esperando que el Host lance la canción...');
    } else {
      setStatusMessage('Esperando...');
    }
  });

  useSocketEvent('first-buzz', (data) => {
    const entry = data?.buzzEntry;
    if (entry && entry.playerId !== playerId) {
      setRoundNotification({
        type: 'buzz',
        message: `🔔 ${entry.playerName} (${entry.teamName}) pulsó primero`,
      });
      setTimeout(() => setRoundNotification(null), 3500);
    }
  });

  useSocketEvent('round-started', (data) => {
    setStatusMessage('¡Música sonando! Pulsá apenas la reconozcas');
    setBuzzPosition(null);
    setRoundNotification({
      type: 'start',
      message: `🎵 ¡Ronda ${data?.roundNumber || ''} en juego!`,
    });
    setTimeout(() => setRoundNotification(null), 2500);
  });

  useSocketEvent('round-result', (data) => {
    setStatusMessage('Ronda finalizada');
    if (data.type === 'correct') {
      setRoundNotification({
        type: 'correct',
        message: `🎉 +${data.pointsAwarded} pt para ${data.teamName} (${data.playerName})`,
      });
    }
    setTimeout(() => setRoundNotification(null), 4000);
  });

  useSocketEvent('round-judgment', (data) => {
    if (data.allBlocked) {
      setRoundNotification({
        type: 'incorrect',
        message: '❌ Todos los equipos fallaron esta ronda',
      });
    } else if (data.reopened) {
      setRoundNotification({
        type: 'incorrect',
        message: `❌ Falló ${data.blocked?.playerName}. ¡Buzzer abierto para los demás!`,
      });
    }
    setTimeout(() => setRoundNotification(null), 3500);
  });

  useSocketEvent('game-over', (data) => {
    navigate('/gameover', { state: { rankings: data.rankings } });
  });

  useSocketEvent('host-disconnected', () => {
    setRoundNotification({
      type: 'warning',
      message: '⚠️ El Anfitrión se desconectó momentáneamente...',
    });
  });

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
    <div className="min-h-dvh flex flex-col justify-between p-4 select-none">
      {/* ── TOP BAR: Room, Round & Teams Ticker ── */}
      <div className="w-full pt-1">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="mono text-xs font-black px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-2xs">
              SALA {roomCode}
            </span>
            {playerState.roundNumber > 0 && (
              <span className="mono text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100">
                Ronda {playerState.roundNumber}
              </span>
            )}
          </div>

          <button
            onClick={() => setShowTeamsModal(true)}
            className="nm-btn text-xs font-bold px-3 py-1.5 rounded-xl text-slate-700 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
                className="bg-white border border-slate-200/80 shadow-2xs flex items-center gap-2 px-3 py-1.5 rounded-xl shrink-0"
                style={{ borderLeft: `4px solid ${t.color}` }}
              >
                <span className="text-xs font-bold text-slate-800 truncate max-w-[90px]">
                  {t.name}
                </span>
                <span className="mono text-xs font-black text-indigo-600">
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
              className="mt-2.5 py-2 px-3.5 rounded-xl text-center text-xs font-extrabold bg-slate-900 text-white shadow-md"
            >
              {roundNotification.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── MIDDLE: Player info & Circular Arcade Buzzer ── */}
      <div className="flex flex-col items-center justify-center my-auto py-2">
        {/* Player Name and Team Pill */}
        <div className="text-center mb-5">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black mb-1.5 shadow-2xs border bg-white"
            style={{
              borderColor: `${playerState.teamColor}40`,
              color: playerState.teamColor || '#4F46E5',
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: playerState.teamColor || '#4F46E5' }}
            />
            {playerState.teamName ? playerState.teamName : 'Sin equipo asignado'}
          </div>
          <h2 className="text-2xl font-black text-slate-900">{playerName}</h2>
        </div>

        {/* 3D Arcade Buzzer */}
        <BuzzerButton
          onBuzz={handleBuzz}
          canBuzz={playerState.canBuzz}
          hasBuzzed={playerState.hasBuzzed}
          isBlocked={playerState.isTeamBlocked || playerState.isPlayerBlocked}
          teamColor={playerState.teamColor}
          isMyTurn={playerState.isMyTurn}
        />

        {/* Status Text & Position */}
        <motion.div
          key={statusMessage}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center px-4"
        >
          <p
            className={`text-base font-black leading-snug tracking-tight ${
              playerState.canBuzz
                ? 'text-indigo-600 animate-pulse'
                : playerState.isMyTurn
                ? 'text-emerald-600'
                : 'text-slate-700'
            }`}
          >
            {statusMessage}
          </p>
          {buzzPosition && (
            <p className="mono text-slate-500 text-xs mt-1 font-bold">
              Puesto en la cola: #{buzzPosition}
            </p>
          )}
        </motion.div>
      </div>

      {/* ── FOOTER ── */}
      <div className="text-center pb-2">
        <p className="text-[11px] text-slate-500 font-medium">
          Mantené tu teléfono desbloqueado para pulsar al instante
        </p>
      </div>

      {/* ── TEAMS & SCOREBOARD MODAL ── */}
      <AnimatePresence>
        {showTeamsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4"
            onClick={() => setShowTeamsModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 text-slate-900 max-h-[80vh] flex flex-col shadow-2xl border border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-base font-black">Tabla de Posiciones</h3>
                  <p className="text-xs text-slate-500">
                    Sala {roomCode} · Ronda {playerState.roundNumber || 1}
                  </p>
                </div>
                <button
                  onClick={() => setShowTeamsModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Team list */}
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {playerState.teams && playerState.teams.length > 0 ? (
                  playerState.teams.map((t) => (
                    <div
                      key={t.name}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200"
                      style={{ borderLeft: `5px solid ${t.color}` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-sm text-slate-900">
                          {t.name}
                        </span>
                        <span className="mono text-sm font-black text-indigo-600">
                          {t.score} {t.score === 1 ? 'pt' : 'pts'}
                        </span>
                      </div>

                      {/* Members */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {t.players && t.players.length > 0 ? (
                          t.players.map((p) => (
                            <span
                              key={p.id || p.name || p}
                              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                                (p.name || p) === playerName
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700'
                              }`}
                            >
                              {p.name || p} {(p.name || p) === playerName ? '(Vos)' : ''}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Sin integrantes
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-sm text-slate-400">
                    No hay equipos asignados aún.
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowTeamsModal(false)}
                className="nm-btn-primary w-full mt-5 py-3.5 rounded-2xl text-xs font-black"
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
