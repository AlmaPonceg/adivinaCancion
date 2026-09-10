import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';
import { useSocketEvent, useSocketEmit } from '../hooks/useSocket';
import QRDisplay from '../components/QRDisplay';
import TeamDisplay from '../components/TeamDisplay';

export default function HostLobby() {
  const navigate = useNavigate();
  const emit = useSocketEmit();
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [numTeams, setNumTeams] = useState(2);

  useEffect(() => {
    socket.emit('create-room', (response) => {
      if (response.code) setRoomCode(response.code);
    });
  }, []);

  useSocketEvent('player-list-updated', (playerList) => {
    setPlayers(playerList);
  });

  useSocketEvent('teams-assigned', (data) => {
    setTeams(data.teams);
    setIsShuffling(false);
  });

  const handleShuffle = async () => {
    if (players.length < 2) return;
    setIsShuffling(true);
    try {
      await emit('shuffle-teams', { roomCode, numTeams });
    } catch (err) {
      console.error('Shuffle error:', err);
      setIsShuffling(false);
    }
  };

  const handleStartGame = () => {
    navigate('/host/game', { state: { roomCode, teams } });
  };

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/play?room=${roomCode}`
    : '';

  return (
    <div className="min-h-dvh bg-glow noise p-6">
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trivia Musical</h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Preparando la sala</p>
          </div>
          <div className="label">Lobby</div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: QR + Room Code */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-8 flex flex-col items-center"
          >
            <p className="label mb-6">Código de sala</p>

            {roomCode ? (
              <>
                <div className="flex gap-2.5 mb-8">
                  {roomCode.split('').map((digit, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.08 }}
                      className="mono w-14 h-18 flex items-center justify-center text-3xl font-bold
                                 bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border)]
                                 text-[var(--color-accent)]"
                    >
                      {digit}
                    </motion.span>
                  ))}
                </div>

                <QRDisplay value={joinUrl} size={200} />

                <p className="text-[var(--color-text-muted)] text-xs mt-5 text-center max-w-[200px] leading-relaxed">
                  Escaneá el código QR o ingresá el número desde tu celular
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </motion.div>

          {/* Right: Players + Teams */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Jugadores</h2>
                <p className="mono text-[var(--color-accent)] text-sm mt-0.5">{players.length} conectados</p>
              </div>
              {players.length >= 2 && (
                <select
                  value={numTeams}
                  onChange={(e) => setNumTeams(Number(e.target.value))}
                  className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)]
                           rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)]
                           focus:outline-none focus:border-[var(--color-accent)]/60 cursor-pointer"
                >
                  <option value={2}>2 equipos</option>
                  <option value={3}>3 equipos</option>
                  <option value={4}>4 equipos</option>
                </select>
              )}
            </div>

            {!teams ? (
              <div className="space-y-1.5 mb-6 max-h-64 overflow-y-auto">
                <AnimatePresence>
                  {players.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12"
                    >
                      <p className="text-[var(--color-text-muted)] text-sm">Esperando jugadores...</p>
                      <div className="accent-line mx-auto mt-4" />
                    </motion.div>
                  ) : (
                    players.map((player, i) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 px-4 py-3
                                   bg-[var(--color-bg-elevated)] rounded-lg"
                      >
                        <div className="w-7 h-7 rounded-full bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/30
                                        flex items-center justify-center text-xs font-bold text-[var(--color-accent)]">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{player.name}</span>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <TeamDisplay teams={teams} />
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2.5 mt-6">
              {!teams ? (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleShuffle}
                  disabled={players.length < 2 || isShuffling}
                  className="w-full py-3.5 rounded-xl font-semibold
                             bg-[var(--color-accent)] text-[var(--color-bg-primary)]
                             disabled:opacity-30 disabled:cursor-not-allowed
                             hover:bg-[var(--color-accent-dim)]
                             transition-colors duration-200 cursor-pointer"
                >
                  {isShuffling ? 'Sorteando...' : 'Sortear equipos'}
                </motion.button>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShuffle}
                    className="w-full py-3 rounded-xl font-medium text-sm
                               bg-transparent text-[var(--color-text-secondary)]
                               border border-[var(--color-border)]
                               hover:border-[var(--color-border-light)] hover:text-[var(--color-text-primary)]
                               transition-all duration-200 cursor-pointer"
                  >
                    Volver a sortear
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartGame}
                    className="w-full py-3.5 rounded-xl font-semibold
                               bg-[var(--color-correct)] text-[var(--color-bg-primary)]
                               hover:brightness-110
                               transition-all duration-200 cursor-pointer"
                  >
                    Iniciar juego
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
