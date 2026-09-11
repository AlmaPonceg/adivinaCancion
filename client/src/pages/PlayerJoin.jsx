import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import socket from '../socket';

export default function PlayerJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState(searchParams.get('room') || '');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

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
                const sessionData = {
                  roomCode: session.roomCode,
                  playerName: session.playerName,
                  playerId: session.playerId,
                  teamName: res.playerState?.teamName || session.teamName,
                  teamColor: res.playerState?.teamColor,
                };
                localStorage.setItem('trivia_player_session', JSON.stringify(sessionData));
                navigate('/play/buzzer', {
                  state: sessionData,
                  replace: true,
                });
              }
            }
          );
        }
      }
    } catch (err) {
      console.error('Session restore error:', err);
    }
  }, [searchParams, navigate]);

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
            teamName: response.playerState?.teamName || '',
            teamColor: response.playerState?.teamColor || '#4F46E5',
          };
          localStorage.setItem('trivia_player_session', JSON.stringify(sessionData));

          // DIRECT TO BUZZER: Never trap the player in an intermediate waiting screen!
          navigate('/play/buzzer', {
            state: sessionData,
            replace: true,
          });
        }
      }
    );
  };

  // ── Join Form View ──────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 bg-[var(--color-console-bg)] text-[var(--color-text-on-dark)]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="console-card p-8 sm:p-10 w-full max-w-sm rounded-3xl relative"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-indigo-500/50" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400">
              Pulsador Móvil
            </span>
            <span className="h-px w-6 bg-gradient-to-l from-transparent to-indigo-500/50" />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-slate-100 mb-1">
            Trivia Musical
          </h1>
          <p className="text-slate-400 text-xs">
            Ingresá tus datos para activar tu pulsador
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
              Tu nombre o apodo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Martín"
              maxLength={20}
              className="w-full px-4 py-3 text-sm font-semibold rounded-xl border border-slate-700 bg-[#0B0F19] text-white"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
              Código de sala (4 dígitos)
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              maxLength={4}
              className="mono w-full px-4 py-3 text-2xl font-black tracking-widest text-center rounded-xl border border-slate-700 bg-[#0B0F19] text-[var(--color-neon-indigo)]"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 font-bold text-center bg-rose-950/50 p-2 rounded-lg border border-rose-800/80">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isJoining}
            className="console-btn-primary w-full py-4 rounded-2xl font-black text-sm disabled:opacity-50 shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isJoining ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Entrando al Pulsador...</span>
              </>
            ) : (
              'Entrar al Pulsador'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
