import { useState } from 'react';
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

  useSocketEvent('your-team', (state) => {
    setPlayerState(state);
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

    setIsJoining(true);
    socket.emit('join-room', {
      roomCode: trimmedCode,
      playerName: trimmedName,
    }, (response) => {
      setIsJoining(false);
      if (response.error) {
        setError(response.error);
      } else {
        setJoined(true);
        // Check if game is already active
        socket.emit('get-player-state', { roomCode: trimmedCode }, (st) => {
          if (st?.gameState && st.gameState !== 'LOBBY' && st.gameState !== 'TEAMS_ASSIGNED') {
            navigate('/play/buzzer', {
              state: { roomCode: trimmedCode, playerName: trimmedName },
            });
          }
        });
      }
    });
  };

  // ── Waiting screen ─────────────────────────────────────────

  if (joined) {
    return (
      <div className="min-h-dvh bg-glow noise flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-10 text-center max-w-sm w-full"
        >
          <div className="w-12 h-12 rounded-full border-2 border-[var(--color-accent)] mx-auto mb-6
                          flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
          </div>

          <h2 className="text-xl font-bold mb-1">Estás dentro</h2>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Conectado como <span className="font-semibold text-[var(--color-accent)]">{name}</span>
          </p>

          {playerState?.teamName ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 px-4 py-3 rounded-lg"
              style={{
                background: `${playerState.teamColor}10`,
                border: `1px solid ${playerState.teamColor}40`,
              }}
            >
              <p className="label mb-1">Tu equipo</p>
              <p className="text-lg font-bold" style={{ color: playerState.teamColor }}>
                {playerState.teamName}
              </p>
            </motion.div>
          ) : (
            <p className="text-[var(--color-text-muted)] text-xs mt-6">
              Esperando sorteo de equipos...
            </p>
          )}

          <div className="mt-8 flex items-center justify-center gap-2 text-[var(--color-text-muted)] text-xs">
            <div className="w-1.5 h-1.5 bg-[var(--color-correct)] rounded-full animate-pulse" />
            Esperando a que inicie el juego
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Join form ──────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-glow noise flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 card p-8 w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-1">Unirse a la partida</h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            Ingresá tus datos para jugar
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="label block mb-2">Tu nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="¿Cómo te llamás?"
              maxLength={20}
              autoComplete="off"
              className="w-full px-4 py-3 rounded-lg bg-[var(--color-bg-elevated)]
                       border border-[var(--color-border)] text-[var(--color-text-primary)]
                       placeholder:text-[var(--color-text-muted)]
                       focus:outline-none focus:border-[var(--color-accent)]/60
                       transition-colors duration-200"
            />
          </div>

          <div>
            <label className="label block mb-2">Código de sala</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="off"
              className="mono w-full px-4 py-3 rounded-lg bg-[var(--color-bg-elevated)]
                       border border-[var(--color-border)] text-[var(--color-text-primary)]
                       placeholder:text-[var(--color-text-muted)]
                       focus:outline-none focus:border-[var(--color-accent)]/60
                       transition-colors duration-200
                       text-2xl text-center tracking-[0.4em] font-bold"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[var(--color-coral)] text-sm text-center bg-[var(--color-coral)]/8 px-4 py-2.5 rounded-lg"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isJoining || !name.trim() || roomCode.length !== 4}
            className="w-full py-3.5 rounded-xl font-semibold
                       bg-[var(--color-accent)] text-[var(--color-bg-primary)]
                       disabled:opacity-30 disabled:cursor-not-allowed
                       hover:bg-[var(--color-accent-dim)]
                       transition-colors duration-200 cursor-pointer"
          >
            {isJoining ? 'Conectando...' : 'Entrar'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
