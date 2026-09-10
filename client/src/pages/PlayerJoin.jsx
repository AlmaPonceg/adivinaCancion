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

  // ── Auto-Reconnect from localStorage (Requirement 1) ────────
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

          socket.emit('reconnect-player', {
            roomCode: session.roomCode,
            playerId: session.playerId,
            playerName: session.playerName,
          }, (res) => {
            setIsJoining(false);
            if (res?.success) {
              if (res.playerState?.gameState && res.playerState.gameState !== 'LOBBY' && res.playerState.gameState !== 'TEAMS_ASSIGNED') {
                navigate('/play/buzzer', {
                  state: { roomCode: session.roomCode, playerName: session.playerName, playerId: session.playerId },
                });
              } else {
                setJoined(true);
                if (res.playerState) setPlayerState(res.playerState);
              }
            }
          });
        }
      }
    } catch (err) {
      console.error('Session restore error:', err);
    }
  }, [searchParams, navigate]);

  useSocketEvent('your-team', (state) => {
    setPlayerState(state);
    // Update team in saved session
    try {
      const saved = localStorage.getItem('trivia_player_session');
      if (saved) {
        const session = JSON.parse(saved);
        session.teamName = state.teamName;
        session.teamIndex = state.teamIndex;
        localStorage.setItem('trivia_player_session', JSON.stringify(session));
      }
    } catch { /* */ }
  });

  useSocketEvent('round-started', () => {
    navigate('/play/buzzer', {
      state: { roomCode: roomCode.trim(), playerName: name.trim() },
    });
  });

  useSocketEvent('player-state-updated', (state) => {
    if (state.gameState && state.gameState !== 'LOBBY' && state.gameState !== 'TEAMS_ASSIGNED') {
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
    socket.emit('join-room', {
      roomCode: trimmedCode,
      playerName: trimmedName,
      playerId: persistentId,
    }, (response) => {
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

        socket.emit('get-player-state', { roomCode: trimmedCode, playerId: sessionData.playerId }, (st) => {
          if (st?.gameState && st.gameState !== 'LOBBY' && st.gameState !== 'TEAMS_ASSIGNED') {
            navigate('/play/buzzer', {
              state: { roomCode: trimmedCode, playerName: trimmedName, playerId: sessionData.playerId },
            });
          }
        });
      }
    });
  };

  // ── Waiting screen (Neumorphic) ────────────────────────────
  if (joined) {
    return (
      <div className="min-h-dvh bg-[var(--nm-bg)] flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="nm-flat p-8 sm:p-10 text-center max-w-sm w-full rounded-2xl"
        >
          <div className="nm-inset w-14 h-14 rounded-full mx-auto mb-6 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <h2 className="text-xl font-bold mb-1">¡Estás dentro!</h2>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Conectado como <span className="font-bold text-[var(--color-accent)]">{name}</span>
          </p>

          {playerState?.teamName ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="nm-inset mt-6 p-4 rounded-xl"
              style={{
                borderLeft: `4px solid ${playerState.teamColor}`,
              }}
            >
              <p className="label mb-1">Tu equipo</p>
              <p className="text-lg font-extrabold" style={{ color: playerState.teamColor }}>
                {playerState.teamName}
              </p>
            </motion.div>
          ) : (
            <p className="text-[var(--color-text-muted)] text-xs mt-6">
              Esperando que el Host sortee los equipos...
            </p>
          )}

          <div className="mt-8 flex items-center justify-center gap-2 text-[var(--color-text-muted)] text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Esperando inicio de la partida</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Join Form (Neumorphic) ─────────────────────────────────
  return (
    <div className="min-h-dvh bg-[var(--nm-bg)] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="nm-flat p-8 sm:p-10 w-full max-w-sm rounded-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] mb-1">
            Trivia Musical
          </h1>
          <p className="text-[var(--color-text-muted)] text-xs">
            Ingresá tu nombre para jugar en tu celular
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="label block mb-2">Tu nombre o apodo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="¿Cómo te llamás?"
              maxLength={20}
              className="w-full px-4 py-3 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="label block mb-2">Código de sala (4 dígitos)</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Ej. 4821"
              maxLength={4}
              className="mono w-full px-4 py-3 text-lg font-bold tracking-widest text-center"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-bold text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isJoining}
            className="nm-btn-primary w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-40"
          >
            {isJoining ? 'Conectando...' : 'Entrar a la Sala'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
