import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';
import { useSocketEvent } from '../hooks/useSocket';
import BuzzerButton from '../components/BuzzerButton';

export default function PlayerBuzzer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode, playerName } = location.state || {};

  const [playerState, setPlayerState] = useState({
    teamName: '',
    teamColor: '#D4A853',
    teamBg: '#19191d',
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
  const [showFlash, setShowFlash] = useState(false);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [roundNotification, setRoundNotification] = useState(null);

  useEffect(() => {
    if (!roomCode) navigate('/play');
  }, [roomCode, navigate]);

  useEffect(() => {
    if (roomCode) {
      socket.emit('get-player-state', { roomCode }, (state) => {
        if (state && !state.error) setPlayerState(state);
      });
    }
  }, [roomCode]);

  useSocketEvent('player-state-updated', (state) => {
    setPlayerState(state);

    if (state.canBuzz) {
      setStatusMessage('¡Pulsá ahora!');
      setBuzzPosition(null);
    } else if (state.isMyTurn) {
      setStatusMessage('¡Tu turno! Decí tu respuesta');
    } else if (state.hasBuzzed) {
      setStatusMessage('Pulsaste. Esperando validación...');
    } else if (state.isTeamBlocked) {
      setStatusMessage('Tu equipo está bloqueado esta ronda');
    } else if (state.isPlayerBlocked) {
      setStatusMessage('Bloqueado esta ronda');
    } else if (state.gameState === 'BUZZER_LOCKED') {
      const judging = state.currentJudging;
      if (judging) {
        setStatusMessage(`${judging.playerName} (${judging.teamName}) tocó primero`);
      } else {
        setStatusMessage('Alguien fue más rápido');
      }
    } else if (state.gameState === 'ROUND_END') {
      setStatusMessage('Ronda terminada');
    } else if (state.gameState === 'TEAMS_ASSIGNED') {
      setStatusMessage('Esperando inicio del host...');
    } else {
      setStatusMessage('Esperando...');
    }
  });

  useSocketEvent('first-buzz', (data) => {
    const entry = data?.buzzEntry;
    if (entry) {
      if (entry.playerId !== socket.id) {
        setRoundNotification({
          type: 'buzz',
          message: `${entry.playerName} (${entry.teamName}) tocó primero`,
        });
        setTimeout(() => setRoundNotification(null), 3500);
      }
    }
  });

  useSocketEvent('round-started', (data) => {
    setStatusMessage('¡Música sonando! Pulsá cuando la sepas');
    setBuzzPosition(null);
    setRoundNotification({
      type: 'start',
      message: `¡Ronda ${data?.roundNumber || ''} en juego!`,
    });
    setTimeout(() => setRoundNotification(null), 2500);
  });

  useSocketEvent('round-result', (data) => {
    setStatusMessage('Ronda terminada');
    if (data.type === 'correct') {
      setRoundNotification({
        type: 'correct',
        message: `+${data.pointsAwarded} pt para ${data.teamName} (${data.playerName})`,
      });
    }
    setTimeout(() => setRoundNotification(null), 4000);
  });

  useSocketEvent('round-judgment', (data) => {
    if (data.allBlocked) {
      setRoundNotification({
        type: 'incorrect',
        message: 'Todos los equipos fallaron esta ronda',
      });
    } else if (data.reopened) {
      setRoundNotification({
        type: 'incorrect',
        message: `Incorrecto de ${data.blocked?.playerName}. ¡Buzzer abierto para los demás!`,
      });
    }
    setTimeout(() => setRoundNotification(null), 3500);
  });

  useSocketEvent('game-over', (data) => {
    navigate('/gameover', { state: { rankings: data.rankings } });
  });

  useSocketEvent('host-disconnected', () => {
    navigate('/play', { state: { error: 'El host se desconectó' } });
  });

  const handleBuzz = useCallback(() => {
    if (!playerState.canBuzz) return;

    if (navigator.vibrate) navigator.vibrate(60);

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 250);

    socket.emit('buzz', { roomCode }, (response) => {
      if (response?.success) {
        setBuzzPosition(response.position);
        setStatusMessage(
          response.position === 1 ? '¡Tocaste primero! Tu turno' : `#${response.position} en la cola`
        );
      }
    });
  }, [playerState.canBuzz, roomCode]);

  const teamBgColor = playerState.teamBg || '#19191d';

  if (!roomCode) return null;

  return (
    <div
      className="min-h-dvh flex flex-col justify-between p-4 relative overflow-hidden select-none"
      style={{
        background: `linear-gradient(160deg, ${lighten(teamBgColor, 15)} 0%, ${teamBgColor} 45%, #0d0d10 100%)`,
      }}
    >
      {/* Screen flash on buzz */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ backgroundColor: playerState.teamColor || '#D4A853' }}
          />
        )}
      </AnimatePresence>

      {/* Glow backdrop */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full blur-[120px] opacity-20"
          style={{ backgroundColor: playerState.teamColor || '#D4A853' }}
        />
      </div>

      {/* ── TOP SECTION: Room Info, Team & Live Scores ── */}
      <div className="relative z-10 w-full pt-1">
        {/* Upper bar: Room Code, Round, View Teams Button */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="mono text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white/90">
              SALA {roomCode}
            </span>
            {playerState.roundNumber > 0 && (
              <span className="mono text-xs text-white/50">
                Ronda {playerState.roundNumber}
              </span>
            )}
          </div>

          <button
            onClick={() => setShowTeamsModal(true)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15
                       border border-white/15 text-white/80 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Tabla y Equipos
          </button>
        </div>

        {/* Live Scoreboard Ticker: Always visible for players without TV */}
        {playerState.teams && playerState.teams.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {playerState.teams.map((t) => (
              <div
                key={t.name}
                className="flex items-center gap-2 px-3 py-1 rounded-lg shrink-0"
                style={{
                  backgroundColor: `${t.color}18`,
                  border: `1px solid ${t.color}40`,
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-xs font-medium text-white/90 truncate max-w-[90px]">
                  {t.name}
                </span>
                <span className="mono text-xs font-bold text-white">
                  {t.score}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Activity Banner */}
        <AnimatePresence>
          {roundNotification && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-2 py-1.5 px-3 rounded-lg text-center text-xs font-medium
                         bg-white/10 backdrop-blur-md border border-white/15 text-white/95 shadow-lg"
            >
              {roundNotification.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── MIDDLE SECTION: Player Identity & Buzzer ── */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-4">
        {/* Player Name and Team Badge */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-1.5"
            style={{
              backgroundColor: `${playerState.teamColor || '#D4A853'}25`,
              color: playerState.teamColor || '#D4A853',
              border: `1px solid ${playerState.teamColor || '#D4A853'}50`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: playerState.teamColor || '#D4A853' }}
            />
            {playerState.teamName ? `Equipo ${playerState.teamName}` : 'Sin equipo asignado'}
          </div>
          <h2 className="text-xl font-bold text-white/95">{playerName}</h2>
        </div>

        {/* Central Buzzer Button */}
        <BuzzerButton
          onBuzz={handleBuzz}
          canBuzz={playerState.canBuzz}
          hasBuzzed={playerState.hasBuzzed}
          isBlocked={playerState.isTeamBlocked || playerState.isPlayerBlocked}
          teamColor={playerState.teamColor}
          isMyTurn={playerState.isMyTurn}
        />

        {/* Status Text & Position Indicator */}
        <motion.div
          key={statusMessage}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center px-4"
        >
          <p className="text-base font-semibold text-white/90 leading-tight">
            {statusMessage}
          </p>
          {buzzPosition && (
            <p className="mono text-white/40 text-xs mt-1">
              Posición registrada: #{buzzPosition}
            </p>
          )}
        </motion.div>
      </div>

      {/* ── BOTTOM BAR: Mini Footer Tip ── */}
      <div className="relative z-10 text-center pb-2">
        <p className="text-[11px] text-white/35">
          Tocá el pulsador apenas reconozcas el tema
        </p>
      </div>

      {/* ── TEAMS & SCOREBOARD MODAL / DRAWER ── */}
      <AnimatePresence>
        {showTeamsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setShowTeamsModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-[#161619] border-t sm:border border-[var(--color-border)]
                         rounded-t-2xl sm:rounded-2xl p-6 text-[var(--color-text-primary)] max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)] mb-4">
                <div>
                  <h3 className="text-base font-bold">Equipos y Puntuación</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Sala {roomCode} · Ronda {playerState.roundNumber || 1}
                  </p>
                </div>
                <button
                  onClick={() => setShowTeamsModal(false)}
                  className="w-8 h-8 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)]
                             flex items-center justify-center text-[var(--color-text-muted)] hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Team list with players & scores */}
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {playerState.teams && playerState.teams.length > 0 ? (
                  playerState.teams.map((t) => (
                    <div
                      key={t.name}
                      className="p-3.5 rounded-xl border"
                      style={{
                        backgroundColor: `${t.color}10`,
                        borderColor: `${t.color}35`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="font-bold text-sm" style={{ color: t.color }}>
                            {t.name}
                          </span>
                        </div>
                        <span className="mono text-base font-bold text-white">
                          {t.score} {t.score === 1 ? 'pt' : 'pts'}
                        </span>
                      </div>

                      {/* Players on this team */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {t.players && t.players.length > 0 ? (
                          t.players.map((p) => (
                            <span
                              key={p.name || p}
                              className={`text-xs px-2.5 py-0.5 rounded-full border ${
                                (p.name || p) === playerName
                                  ? 'bg-white/20 border-white/40 text-white font-semibold'
                                  : 'bg-black/30 border-white/10 text-white/70'
                              }`}
                            >
                              {(p.name || p)} {(p.name || p) === playerName ? '(Vos)' : ''}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-white/40 italic">Sin integrantes</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-sm text-[var(--color-text-muted)]">
                    No hay equipos conformados aún.
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowTeamsModal(false)}
                className="w-full mt-5 py-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]
                           text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                Volver al pulsador
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function lighten(hex, amount) {
  const clamp = (v) => Math.min(255, Math.max(0, v));
  let c = (hex || '#19191d').replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const r = clamp(parseInt(c.substring(0, 2), 16) + amount);
  const g = clamp(parseInt(c.substring(2, 4), 16) + amount);
  const b = clamp(parseInt(c.substring(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
