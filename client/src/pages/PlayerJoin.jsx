import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import socket from '../socket';
import { useSocketEvent } from '../hooks/useSocket';

export default function PlayerJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState(searchParams.get('room') || '');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [playerState, setPlayerState] = useState(null);

  // ── Auto-Reconnect from localStorage ────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('trivia_player_session');
      if (saved) {
        const session = JSON.parse(saved);
        const currentRoomParam = searchParams.get('room');
        const targetRoom = currentRoomParam || session.roomCode;

        if (session.playerId && session.playerName && session.roomCode === targetRoom) {
          setName(session.playerName);
          setRoomCode(session.roomCode);
          setIsJoining(true);

          socket.emit(
            'reconnect-player',
            {
              roomCode: session.roomCode,
              playerId: session.playerId,
              playerName: session.playerName,
            },
            (res) => {
              setIsJoining(false);
              if (res?.success) {
                if (
                  res.playerState?.gameState &&
                  res.playerState.gameState !== 'LOBBY' &&
                  res.playerState.gameState !== 'TEAMS_ASSIGNED'
                ) {
                  navigate('/play/buzzer', {
                    state: {
                      roomCode: session.roomCode,
                      playerName: session.playerName,
                      playerId: session.playerId,
                    },
                  });
                } else {
                  setJoined(true);
                  if (res.playerState) setPlayerState(res.playerState);
                }
              }
            }
          );
        }
      }
    } catch (err) {
      console.error('Session restore error:', err);
    }
  }, [searchParams, navigate]);

  useSocketEvent('your-team', (state) => {
    setPlayerState(state);
    try {
      const saved = localStorage.getItem('trivia_player_session');
      if (saved) {
        const session = JSON.parse(saved);
        session.teamName = state.teamName;
        session.teamIndex = state.teamIndex;
        localStorage.setItem('trivia_player_session', JSON.stringify(session));
      }
    } catch {
      /* */
    }
  });

  useSocketEvent('game-started', () => {
    navigate('/play/buzzer', {
      state: { roomCode: roomCode.trim(), playerName: name.trim() },
    });
  });

  useSocketEvent('round-started', () => {
    navigate('/play/buzzer', {
      state: { roomCode: roomCode.trim(), playerName: name.trim() },
    });
  });

  useSocketEvent('player-state-updated', (state) => {
    if (state.gameState && state.gameState !== 'LOBBY') {
      navigate('/play/buzzer', {
        state: { roomCode: roomCode.trim(), playerName: name.trim() },
      });
    }
  });

  const handleJoin = (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedCode = roomCode.trim();

    if (!trimmedName || !trimmedCode) {
      setError('Ingresá tu nombre y el código de sala');
      return;
    }
    if (trimmedCode.length !== 4) {
      setError('El código debe ser de 4 dígitos');
      return;
    }

    let persistentId = localStorage.getItem('trivia_player_id');
    if (!persistentId) {
      persistentId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('trivia_player_id', persistentId);
    }

    setIsJoining(true);
    socket.emit(
      'join-room',
      {
        roomCode: trimmedCode,
        playerName: trimmedName,
        playerId: persistentId,
      },
      (response) => {
        setIsJoining(false);
        if (response.error) {
          setError(response.error);
        } else {
          const sessionData = {
            roomCode: trimmedCode,
            playerName: trimmedName,
            playerId: response.player?.id || persistentId,
          };
          localStorage.setItem('trivia_player_session', JSON.stringify(sessionData));
          setJoined(true);

          socket.emit(
            'get-player-state',
            { roomCode: trimmedCode, playerId: sessionData.playerId },
            (st) => {
              if (st?.gameState && st.gameState !== 'LOBBY' && st.gameState !== 'TEAMS_ASSIGNED') {
                navigate('/play/buzzer', {
                  state: {
                    roomCode: trimmedCode,
                    playerName: trimmedName,
                    playerId: sessionData.playerId,
                  },
                });
              }
            }
          );
        }
      }
    );
  };

  // ── Waiting Screen ──────────────────────────────────────────
  if (joined) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="nm-flat p-8 sm:p-10 text-center max-w-sm w-full rounded-3xl relative overflow-hidden"
        >
          {/* Glowing pulse ring */}
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 mx-auto mb-5 flex items-center justify-center relative">
            <span className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 mb-1">¡Estás dentro!</h2>
          <p className="text-slate-600 text-sm">
            Participando como <span className="font-extrabold text-indigo-600">{name}</span>
          </p>

          {playerState?.teamName ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center shadow-xs"
              style={{
                borderLeft: `5px solid ${playerState.teamColor}`,
              }}
            >
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">Tu equipo</p>
              <p className="text-lg font-black" style={{ color: playerState.teamColor }}>
                {playerState.teamName}
              </p>
            </motion.div>
          ) : (
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <p className="text-xs text-slate-500 font-medium">
                Esperando que el Anfitrión sortee los equipos...
              </p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Mantené esta pantalla abierta para el pulsador</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Join Form ───────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="nm-flat p-8 sm:p-10 w-full max-w-sm rounded-3xl"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-extrabold uppercase tracking-wider mb-3">
            Pulsador en tu celular
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-1">
            Trivia Musical
          </h1>
          <p className="text-slate-500 text-xs">
            Ingresá tus datos para unirte a la partida
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
              Tu nombre o apodo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Martín"
              maxLength={20}
              className="w-full px-4 py-3 text-sm font-semibold rounded-xl border border-slate-300"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
              Código de sala (4 dígitos)
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              maxLength={4}
              className="mono w-full px-4 py-3 text-2xl font-black tracking-widest text-center rounded-xl border border-slate-300 text-indigo-600"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-bold text-center bg-rose-50 p-2 rounded-lg border border-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isJoining}
            className="nm-btn-primary w-full py-4 rounded-2xl font-black text-sm disabled:opacity-40 shadow-md"
          >
            {isJoining ? 'Conectando...' : 'Entrar a la Partida'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
