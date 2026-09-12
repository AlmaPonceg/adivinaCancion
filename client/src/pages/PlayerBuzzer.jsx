import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';
import { useSocketEvent } from '../hooks/useSocket';
import BuzzerButton from '../components/BuzzerButton';
import LobbyAudio from '../components/LobbyAudio';

function computeStatusMessage(st) {
  if (!st) return 'Conectando al juego...';
  if (st.isMyTurn) return '¡TU TURNO! CANTÁ O RESPONDÉ';
  if (st.hasBuzzed) return 'Registrado en la fila. Esperando al jurado...';
  if (st.hasTeamBuzzed) {
    return st.teamBuzzedPlayerName
      ? `${st.teamBuzzedPlayerName} ya pulsó por tu equipo`
      : 'Un compañero de tu equipo ya pulsó el botón';
  }
  if (st.canBuzz) return '¡MÚSICA SONANDO! TOCÁ EL BOTÓN';
  if (st.isTeamBlocked) return 'Tu equipo fue bloqueado esta ronda';
  if (st.isPlayerBlocked) return 'Bloqueado en esta ronda';
  if (st.gameState === 'BUZZER_LOCKED') {
    const judging = st.currentJudging;
    return judging ? `${judging.playerName} (${judging.teamName}) respondió` : 'Alguien fue más rápido';
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
    hasTeamBuzzed: false,
    teamBuzzedPlayerName: null,
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
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const wasDisconnectedRef = useRef(!socket.connected);
  const reconnectTimeoutRef = useRef(null);

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

  // ── Sync & Reconnection Logic ──────────────────────────────
  const syncSession = useCallback(
    (isSilent = false) => {
      if (!isSilent) {
        setIsReconnecting(true);
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Safety timeout: Never leave player trapped in reconnecting overlay
      reconnectTimeoutRef.current = setTimeout(() => {
        setIsReconnecting(false);
        setIsConnected(socket.connected);
      }, 3500);

      socket.emit('reconnect-player', { roomCode, playerId, playerName }, (res) => {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        setIsReconnecting(false);
        setIsConnected(true);

        if (wasDisconnectedRef.current) {
          wasDisconnectedRef.current = false;
          setRoundNotification({
            type: 'connected',
            message: 'Conexión restablecida. Sincronizado con la partida.',
          });
          setTimeout(() => setRoundNotification(null), 3500);
        }

        if (res?.success && res.playerState) {
          setPlayerState(res.playerState);
          if (
            res.playerState.gameState !== 'TEAMS_ASSIGNED' &&
            res.playerState.gameState !== 'LOBBY'
          ) {
            setHasGameStarted(true);
          }
          setStatusMessage(computeStatusMessage(res.playerState));
        } else {
          // Fallback if reconnect didn't find player (e.g. server restart)
          socket.emit('join-room', { roomCode, playerName, playerId }, (joinRes) => {
            if (joinRes?.playerState) {
              setPlayerState(joinRes.playerState);
              if (
                joinRes.playerState.gameState !== 'TEAMS_ASSIGNED' &&
                joinRes.playerState.gameState !== 'LOBBY'
              ) {
                setHasGameStarted(true);
              }
              setStatusMessage(computeStatusMessage(joinRes.playerState));
            } else {
              socket.emit('get-player-state', { roomCode, playerId }, (st) => {
                if (st && !st.error) {
                  setPlayerState(st);
                  if (
                    st.gameState !== 'TEAMS_ASSIGNED' &&
                    st.gameState !== 'LOBBY'
                  ) {
                    setHasGameStarted(true);
                  }
                  setStatusMessage(computeStatusMessage(st));
                }
              });
            }
          });
        }
      });
    },
    [roomCode, playerId, playerName]
  );

  const handleManualReconnect = useCallback(() => {
    if (!socket.connected) {
      socket.connect();
    }
    syncSession(false);
  }, [syncSession]);

  // ── Sync & Reconnection on Unlock / Visibility Change ──────
  useEffect(() => {
    if (!roomCode || !playerId) {
      navigate('/play');
      return;
    }

    // Run immediately if already connected
    if (socket.connected) {
      syncSession(true);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (socket.connected) {
          syncSession(true);
        } else {
          socket.connect();
          syncSession(false);
        }
      }
    };

    const handleOnline = () => {
      if (!socket.connected) {
        socket.connect();
      }
      syncSession(false);
    };

    const handleOffline = () => {
      wasDisconnectedRef.current = true;
      setIsConnected(false);
      setIsReconnecting(false);
    };

    const onConnect = () => {
      syncSession(false);
    };

    const onDisconnect = () => {
      wasDisconnectedRef.current = true;
      setIsConnected(false);
      setIsReconnecting(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [roomCode, playerId, navigate, syncSession]);

  // ── Sockets Listeners ──────────────────────────────────────

  // Round started -> Immediately activate buzzer!
  useSocketEvent('round-started', (data) => {
    setHasGameStarted(true);
    setShowTeamsModal(false);
    setPlayerState((prev) => ({
      ...prev,
      canBuzz: true,
      hasBuzzed: false,
      hasTeamBuzzed: false,
      teamBuzzedPlayerName: null,
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
      hasTeamBuzzed: false,
      teamBuzzedPlayerName: null,
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
    setHasGameStarted(true);
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

  useSocketEvent('team-buzzed', (data) => {
    if (data && data.teamIndex !== undefined && data.teamIndex === playerState.teamIndex) {
      const isMe = data.playerId === playerId;
      setPlayerState((prev) => {
        const updated = {
          ...prev,
          canBuzz: false,
          hasBuzzed: isMe ? true : prev.hasBuzzed,
          hasTeamBuzzed: true,
          teamBuzzedPlayerName: data.playerName,
        };
        setStatusMessage(computeStatusMessage(updated));
        return updated;
      });

      if (!isMe) {
        setRoundNotification({
          type: 'buzz',
          message: `${data.playerName} pulsó por tu equipo`,
        });
        setTimeout(() => setRoundNotification(null), 3500);
      }
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
          hasTeamBuzzed: false,
          teamBuzzedPlayerName: null,
          gameState: 'ROUND_END',
        };
      });
    } else {
      setPlayerState((prev) => ({
        ...prev,
        canBuzz: false,
        hasBuzzed: false,
        hasTeamBuzzed: false,
        teamBuzzedPlayerName: null,
        gameState: 'ROUND_END',
      }));
    }

    // El resultado se notifica limpiamente con el banner superior
    setTimeout(() => setRoundNotification(null), 4000);
  });

  useSocketEvent('round-judgment', (data) => {
    if (data.nextUp) {
      const isMe = data.nextUp.playerId === playerId || data.nextUp.teamIndex === playerState.teamIndex;
      setRoundNotification({
        type: isMe ? 'buzz' : 'warning',
        message: isMe
          ? '¡Tu turno! Falló el equipo anterior. ¡CANTÁ O RESPONDÉ!'
          : `Falló ${data.blocked?.playerName}. Turno de ${data.nextUp.playerName} (${data.nextUp.teamName})`,
      });
      setPlayerState((prev) => {
        const isMyTurnNow = data.nextUp.playerId === playerId;
        return {
          ...prev,
          currentJudging: data.nextUp,
          isMyTurn: isMyTurnNow,
          hasBuzzed: isMyTurnNow ? true : prev.hasBuzzed,
        };
      });
      if (isMe) {
        setStatusMessage('¡TU TURNO! CANTÁ O RESPONDÉ');
        setBuzzPosition(null);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([120, 60, 120]);
        }
      }
    } else if (data.allBlocked) {
      setRoundNotification({
        type: 'incorrect',
        message: 'Todos los equipos fallaron esta ronda',
      });
      setPlayerState((prev) => ({
        ...prev,
        canBuzz: false,
        hasBuzzed: false,
        hasTeamBuzzed: false,
        teamBuzzedPlayerName: null,
        gameState: 'ROUND_END',
      }));
      setBuzzPosition(null);
    } else if (data.reopened) {
      setRoundNotification({
        type: 'incorrect',
        message: `Falló ${data.blocked?.playerName}. Pulsadores reabiertos`,
      });
      setPlayerState((prev) => {
        const canBuzzNow = !prev.isTeamBlocked && !prev.isPlayerBlocked && !prev.hasTeamBuzzed;
        const updated = {
          ...prev,
          canBuzz: canBuzzNow,
          hasBuzzed: false,
        };
        setStatusMessage(computeStatusMessage(updated));
        return updated;
      });
      setBuzzPosition(null);
    }
    setTimeout(() => setRoundNotification(null), 3500);
  });

  useSocketEvent('buzz-queue-updated', (data) => {
    const queue = data?.buzzQueue || [];
    const myEntry = queue.find(
      (b) => b.playerId === playerId || (b.teamIndex !== undefined && b.teamIndex === playerState.teamIndex)
    );
    if (myEntry) {
      setBuzzPosition(myEntry.position);
    } else if (!playerState.isMyTurn) {
      setBuzzPosition(null);
    }
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
    if (!playerState.canBuzz || playerState.hasBuzzed || playerState.hasTeamBuzzed) return;

    socket.emit('buzz', { roomCode }, (response) => {
      if (response?.success) {
        setBuzzPosition(response.position);
        setStatusMessage(
          response.position === 1 ? '¡Tocaste primero! Tu turno' : `#${response.position} en la cola`
        );
      } else if (response?.error) {
        setStatusMessage(response.error);
      }
    });
  }, [playerState.canBuzz, playerState.hasBuzzed, playerState.hasTeamBuzzed, roomCode]);

  const isGameStarted =
    hasGameStarted ||
    (playerState.gameState !== 'TEAMS_ASSIGNED' && playerState.gameState !== 'LOBBY');

  if (!roomCode) return null;

  return (
    <div className="min-h-dvh flex flex-col justify-between p-4 select-none text-[var(--color-text-primary)] relative">
      {/* ── CONNECTION OVERLAYS ── */}
      <AnimatePresence>
        {(!isConnected || isReconnecting) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#181226]/85 backdrop-blur-md p-6"
          >
            <div
              className="party-card text-center p-7 max-w-sm w-full relative overflow-hidden rounded-[2.2rem] border-2 shadow-2xl bg-white"
              style={{ borderColor: !isConnected ? '#FF5722' : '#059669' }}
            >
              <div className="flex justify-center mb-4">
                {!isConnected ? (
                  <div className="w-20 h-20 rounded-full bg-[#FFF0EB] border-2 border-[#FF5722]/30 flex items-center justify-center shadow-inner">
                    <svg
                      className="w-10 h-10 text-[#FF5722]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="2" y1="2" x2="22" y2="22" />
                      <path d="M12 20h.01" />
                      <path d="M8.5 16.429a5 5 0 0 1 7 0" />
                      <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
                      <path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
                      <path d="M2 8.82a15 15 0 0 1 4.177-2.643" />
                      <path d="M22 8.82a15 15 0 0 0-11.288-3.764" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#E6F9F0] border-2 border-[#059669]/30 flex items-center justify-center shadow-inner">
                    <svg
                      className="w-10 h-10 text-[#059669] animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  </div>
                )}
              </div>
              <h2 className="font-display text-2xl font-black text-[#181226] mb-2">
                {!isConnected ? 'Sin Conexión' : 'Reconectando...'}
              </h2>
              <p className="text-[#574F6B] font-bold text-sm leading-relaxed mb-5">
                {!isConnected
                  ? 'Revisá tu conexión a internet o el WiFi del salón.'
                  : 'Sincronizando con la partida, preparate para jugar.'}
              </p>

              <button
                type="button"
                onClick={handleManualReconnect}
                className="arcade-btn-primary w-full py-3.5 px-4 rounded-xl text-xs font-black tracking-wide uppercase shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                {!isConnected ? 'Reintentar conexión' : 'Forzar sincronización'}
              </button>

              {isReconnecting && (
                <button
                  type="button"
                  onClick={() => {
                    setIsReconnecting(false);
                    setIsConnected(true);
                  }}
                  className="w-full py-2 px-4 rounded-xl text-xs font-bold text-[#746B8A] hover:text-[#181226] cursor-pointer mt-2 transition-colors"
                >
                  Continuar a la sala
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP BAR: Room, Round & Standings HUD ── */}
      <header className="w-full pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border-2 border-[#DDD5C5] shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#059669] shadow-[0_0_8px_#059669]" />
              <span className="mono text-xs font-black tracking-wider text-[#181226]">
                SALA {roomCode}
              </span>
            </div>
            {playerState.roundNumber > 0 && isGameStarted && (
              <div className="mono text-xs font-black px-3 py-1.5 rounded-xl bg-[#FFF3EB] text-[#FF5722] border border-[#FF5722]/30 shadow-xs">
                RONDA {playerState.roundNumber}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <LobbyAudio isGameStarted={isGameStarted} initialVolume={0.35} />
            <button
              onClick={() => setShowTeamsModal(true)}
              className="arcade-btn text-xs font-bold px-3 py-1.5 rounded-xl text-[#181226] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            >
              <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Posiciones</span>
            </button>
          </div>
        </div>

        {/* Live Scoreboard ticker */}
        {playerState.teams && playerState.teams.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {playerState.teams.map((t) => (
              <div
                key={t.name}
                className="bg-white border border-[#E0D9CB] shadow-xs flex items-center gap-2 px-3 py-1.5 rounded-xl shrink-0"
                style={{ borderLeft: `4px solid ${t.color}` }}
              >
                <span className="text-xs font-extrabold text-[#181226] truncate max-w-[95px]">
                  {t.name}
                </span>
                <span className="mono text-xs font-black text-[#FF5722] bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#E5DFD5]">
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
              className={`mt-2.5 py-2 px-3.5 rounded-xl text-center text-xs font-extrabold shadow-lg ${
                roundNotification.type === 'connected'
                  ? 'bg-[#059669] text-white border border-[#047857]'
                  : 'bg-[#181226] text-white border border-[#FF5722]/50'
              }`}
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
              className="party-card w-full p-6 shadow-xl border-2 relative overflow-hidden rounded-[2.2rem]"
              style={{ borderColor: playerState.teamColor || '#FF5722' }}
            >
              {/* Color accent header strip */}
              <div
                className="absolute top-0 left-0 right-0 h-2 opacity-90"
                style={{ backgroundColor: playerState.teamColor || '#FF5722' }}
              />

              <div className="text-center mb-5 pt-1">
                <p className="badge-tag text-[#FF5722] mb-1 font-extrabold">
                  SORTEO DE EQUIPOS
                </p>
                <h3 className="font-display text-lg font-black text-[#181226]">
                  Tu equipo asignado
                </h3>
              </div>

              {/* Editable Team Name */}
              <div className="p-4 rounded-2xl bg-[#F7F4EE] border border-[#E5DFD5] mb-4 text-center shadow-inner">
                {isEditingTeamName ? (
                  <div className="space-y-2.5">
                    <p className="text-xs font-bold text-[#4A425E]">Nuevo nombre del equipo:</p>
                    <input
                      type="text"
                      value={customTeamName}
                      onChange={(e) => setCustomTeamName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveTeamName()}
                      maxLength={25}
                      autoFocus
                      placeholder="Ej. Los Reyes del Pop"
                      className="w-full px-3 py-2 text-sm font-black rounded-xl border-2 border-[#FF5722] text-center bg-white text-[#181226]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditingTeamName(false)}
                        className="flex-1 py-2 text-xs font-bold text-[#746B8A] hover:text-[#181226]"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveTeamName}
                        className="arcade-btn-primary flex-1 py-2 text-xs font-black rounded-xl"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3
                      className="font-display text-2xl font-black mb-1.5 break-words tracking-tight"
                      style={{ color: playerState.teamColor || '#FF5722' }}
                    >
                      {myTeam?.name || playerState.teamName}
                    </h3>
                    <button
                      onClick={() => {
                        setCustomTeamName(myTeam?.name || playerState.teamName);
                        setIsEditingTeamName(true);
                      }}
                      className="text-xs font-bold text-[#E11D48] hover:underline inline-flex items-center gap-1.5 cursor-pointer mt-1"
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
                <p className="font-tactical text-[11px] font-black uppercase tracking-wider text-[#746B8A] mb-2.5 text-center">
                  Integrantes ({myTeam?.players?.length || 1}/4):
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {myTeam?.players?.map((p) => {
                    const pName = p.name || p;
                    const isMe = pName.toLowerCase() === playerName.toLowerCase();
                    return (
                      <span
                        key={p.id || pName}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                          isMe
                            ? 'bg-[#FF5722] text-white font-black border-[#E64A19] shadow-xs'
                            : 'bg-[#F7F4EE] border-[#E0D9CB] text-[#181226]'
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
                <div className="p-4 rounded-2xl bg-[#E6F9F0] border-2 border-[#059669] text-center shadow-md">
                  <div className="flex items-center justify-center gap-2 text-[#059669] font-black text-sm mb-1">
                    <svg className="w-5 h-5 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    ¡Tu equipo está LISTO!
                  </div>
                  <p className="text-xs text-[#047857] font-semibold">
                    Esperando que los demás equipos confirmen para iniciar...
                  </p>
                  <button
                    onClick={handleToggleReady}
                    className="text-[11px] font-bold text-[#746B8A] hover:text-[#181226] underline mt-2.5 cursor-pointer block mx-auto"
                  >
                    Desmarcar o cambiar nombre
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    onClick={handleToggleReady}
                    className="arcade-btn-mint w-full py-4 px-6 rounded-2xl font-black text-base active:scale-98 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    ¡Estamos Listos!
                  </button>
                  <p className="text-[11px] text-[#746B8A] text-center mt-2 font-medium">
                    Con que 1 integrante toque este botón, tu equipo ya queda confirmado.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="text-center my-auto p-6 max-w-sm mx-auto">
            <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#E5DFD5] flex items-center justify-center shadow-md text-[#FF5722]">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
            </div>
            <h2 className="font-display text-xl font-black text-[#181226] mb-1.5 tracking-tight">¡Estás en la partida!</h2>
            <p className="text-xs text-[#574F6B] font-semibold leading-relaxed">
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
                ? '#059669'
                : playerState.canBuzz
                ? (playerState.teamColor || '#FF5722')
                : 'transparent',
              opacity: playerState.isMyTurn ? 0.25 : playerState.canBuzz ? 0.2 : 0,
              transform: playerState.canBuzz || playerState.isMyTurn ? 'translate(-50%, -50%) scale(1.18)' : 'translate(-50%, -50%) scale(0.8)',
            }}
          />

          {/* Player Gamer Profile Card (Daytime High Contrast) */}
          <div className="flex flex-col items-center mb-5 z-10">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-2xl bg-white border-2 border-[#E0D9CB] shadow-md">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-xs"
                style={{
                  backgroundColor: playerState.teamColor || '#FF5722',
                }}
              >
                {playerName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <span className="block text-sm font-black text-[#181226] leading-tight">
                  {playerName}
                </span>
                <span
                  className="block text-[10px] font-extrabold uppercase tracking-wider leading-none mt-0.5"
                  style={{ color: playerState.teamColor || '#FF5722' }}
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
              hasTeamBuzzed={playerState.hasTeamBuzzed}
              isBlocked={playerState.isTeamBlocked || playerState.isPlayerBlocked}
              teamColor={playerState.teamColor || '#FF5722'}
              isMyTurn={playerState.isMyTurn}
            />
          </div>

          {/* Tactical Status HUD (Outdoor Daytime High Contrast) */}
          <motion.div
            key={statusMessage}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mt-6 text-center px-4 w-full max-w-xs z-10"
          >
            {/* Audio Equalizer dancing wave when music is live */}
            {playerState.canBuzz && (
              <div className="flex items-center justify-center gap-1.5 mb-2.5">
                <span className="w-1.5 bg-[#FF5722] rounded-full eq-bar-1" />
                <span className="w-1.5 bg-[#E11D48] rounded-full eq-bar-2" />
                <span className="w-1.5 bg-[#059669] rounded-full eq-bar-3" />
                <span className="w-1.5 bg-[#D97706] rounded-full eq-bar-4" />
                <span className="w-1.5 bg-[#FF5722] rounded-full eq-bar-2" />
              </div>
            )}

            <div
              className={`py-3.5 px-4 rounded-2xl border-2 font-tactical font-black text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 ${
                playerState.isMyTurn
                  ? 'bg-[#E6F9F0] border-[#059669] text-[#047857] shadow-md'
                  : playerState.canBuzz
                  ? 'bg-[#FFF0EB] border-[#FF5722] text-[#C23B11] shadow-lg shadow-[#FF5722]/20 animate-pulse'
                  : playerState.hasBuzzed || playerState.hasTeamBuzzed
                  ? 'bg-white border-[#D6CEBF] text-[#181226]'
                  : playerState.isTeamBlocked || playerState.isPlayerBlocked
                  ? 'bg-[#FFE4E9] border-[#E11D48] text-[#BE123C]'
                  : 'bg-[#F1ECE3] border-[#DDD5C5] text-[#574F6B]'
              }`}
            >
              <span>{statusMessage}</span>
            </div>

            {buzzPosition && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-[#E0D9CB] text-[#181226] mono text-xs font-black shadow-xs">
                <span>PUESTO EN LA COLA:</span>
                <span className="text-[#FF5722] font-black">#{buzzPosition}</span>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="text-center pb-2">
        <p className="text-[11px] text-[#746B8A] font-semibold">
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
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
            onClick={() => setShowTeamsModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="w-full max-w-md bg-[#FAF7F2] rounded-t-3xl sm:rounded-3xl p-6 text-[#181226] max-h-[82vh] flex flex-col shadow-2xl border-2 border-[#E5DFD5]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-[#E5DFD5] mb-4">
                <div>
                  <h3 className="font-display text-base font-black text-[#181226] tracking-tight">Tabla de Posiciones</h3>
                  <p className="text-xs text-[#746B8A] font-medium">
                    Sala {roomCode} · Ronda {playerState.roundNumber || 1}
                  </p>
                </div>
                <button
                  onClick={() => setShowTeamsModal(false)}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-[#EAE4D7] border border-[#DDD5C5] flex items-center justify-center text-[#181226] font-black cursor-pointer transition-colors"
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
                      className="p-3.5 rounded-2xl bg-white border border-[#E0D9CB] shadow-xs"
                      style={{ borderLeft: `5px solid ${t.color}` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="mono text-xs font-black text-[#746B8A]">
                            #{idx + 1}
                          </span>
                          <span className="font-black text-sm text-[#181226]">
                            {t.name}
                          </span>
                        </div>
                        <span className="mono text-sm font-black text-[#FF5722] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E5DFD5]">
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
                                className={`text-xs px-2.5 py-1 rounded-xl font-bold border ${
                                  isMe
                                    ? 'bg-[#FF5722] border-[#E64A19] text-white shadow-xs font-black'
                                    : 'bg-[#F7F4EE] border-[#E0D9CB] text-[#181226]'
                                }`}
                              >
                                {pName} {isMe ? '(Vos)' : ''}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-[#A39DB5] italic">
                            Sin integrantes
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-sm text-[#746B8A]">
                    No hay equipos asignados aún.
                  </p>
                )}
              </div>

              <div className="mt-4 p-3 rounded-xl bg-white border border-[#E0D9CB] text-center">
                <p className="text-[11px] font-semibold text-[#574F6B]">
                  El pulsador responderá instantáneamente en tu pantalla cuando el anfitrión reproduzca la canción.
                </p>
              </div>

              <button
                onClick={() => setShowTeamsModal(false)}
                className="arcade-btn-primary w-full mt-3 py-3.5 rounded-2xl text-xs font-black cursor-pointer shadow-md active:scale-98 transition-transform"
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
