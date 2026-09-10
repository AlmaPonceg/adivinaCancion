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

  // URL & Sharing state
  const [baseUrl, setBaseUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trivia_base_url');
      if (saved) return saved;
      return window.location.origin;
    }
    return '';
  });
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch local IP from backend if running on localhost
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      const saved = localStorage.getItem('trivia_base_url');
      if (!saved) {
        fetch('/api/config')
          .then(res => res.json())
          .then(data => {
            if (data?.localIp && data.localIp !== 'localhost') {
              const detected = `http://${data.localIp}:${window.location.port || 5173}`;
              setBaseUrl(detected);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

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

  const cleanBase = baseUrl.replace(/\/+$/, '');
  const joinUrl = roomCode ? `${cleanBase}/play?room=${roomCode}` : '';

  const handleCopyLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const handleShareWhatsApp = () => {
    if (!joinUrl) return;
    const text = encodeURIComponent(
      `¡Unite a la Trivia Musical de Cumpleaños! Sala: ${roomCode}. Tocá acá para entrar directamente: ${joinUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSaveCustomUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      let formatted = trimmed;
      if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
        formatted = `https://${formatted}`;
      }
      setBaseUrl(formatted);
      localStorage.setItem('trivia_base_url', formatted);
    } else {
      const fallback = window.location.origin;
      setBaseUrl(fallback);
      localStorage.removeItem('trivia_base_url');
    }
    setIsEditingUrl(false);
  };

  return (
    <div className="min-h-dvh bg-glow noise p-4 sm:p-6">
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 sm:mb-8"
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Trivia Musical</h1>
            <p className="text-[var(--color-text-muted)] text-xs sm:text-sm mt-0.5">
              Panel de control del Host
            </p>
          </div>
          <div className="label bg-[var(--color-bg-elevated)] px-3 py-1 rounded-full border border-[var(--color-border)]">
            Lobby
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Code, QR, & Mobile Sharing */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6 sm:p-8 flex flex-col items-center"
          >
            <p className="label mb-4">Código de sala</p>

            {roomCode ? (
              <>
                <div className="flex gap-2 sm:gap-2.5 mb-6">
                  {roomCode.split('').map((digit, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.08 }}
                      className="mono w-12 h-16 sm:w-14 sm:h-18 flex items-center justify-center text-2xl sm:text-3xl font-bold
                                 bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border)]
                                 text-[var(--color-accent)]"
                    >
                      {digit}
                    </motion.span>
                  ))}
                </div>

                {/* Quick Share Buttons (Essential for mobile play without TV) */}
                <div className="w-full flex flex-col sm:flex-row gap-2.5 mb-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShareWhatsApp}
                    className="flex-1 py-3 px-4 rounded-xl font-medium text-sm
                               bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366]
                               hover:bg-[#25D366]/25 transition-all duration-200
                               flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.961.897 2.796.897 3.182 0 5.769-2.587 5.769-5.766.001-3.181-2.586-5.766-5.769-5.766zm9.969 5.766c0 5.514-4.486 10-10 10-1.745 0-3.376-.452-4.801-1.241l-5.2 1.361 1.385-5.066c-.928-1.503-1.464-3.267-1.464-5.054 0-5.514 4.486-10 10-10 5.514 0 10 4.486 10 10z"/>
                    </svg>
                    Compartir por WhatsApp
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopyLink}
                    className="flex-1 py-3 px-4 rounded-xl font-medium text-sm
                               bg-[var(--color-bg-elevated)] border border-[var(--color-border)]
                               text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
                               hover:border-[var(--color-accent)]/50 transition-all duration-200
                               flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 text-[var(--color-correct)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-[var(--color-correct)]">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copiar link</span>
                      </>
                    )}
                  </motion.button>
                </div>

                {/* QR Code */}
                <div className="p-3 bg-[var(--color-bg-elevated)] rounded-xl border border-[var(--color-border)] mb-4">
                  <QRDisplay value={joinUrl} size={180} />
                </div>

                {/* URL configuration / info */}
                <div className="w-full text-center">
                  {!isEditingUrl ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span className="truncate max-w-[240px] mono">{joinUrl}</span>
                      <button
                        onClick={() => {
                          setUrlInput(baseUrl);
                          setIsEditingUrl(true);
                        }}
                        className="text-[var(--color-accent)] hover:underline cursor-pointer"
                      >
                        (cambiar)
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 p-3 bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border)] text-left">
                      <span className="label text-[10px]">URL base de la app / deploy:</span>
                      <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://tu-deploy.onrender.com o http://192.168.1.X:5173"
                        className="w-full px-3 py-1.5 text-xs bg-[var(--color-bg-surface)] rounded border border-[var(--color-border)] text-[var(--color-text-primary)]"
                      />
                      <div className="flex justify-end gap-2 mt-1">
                        <button
                          onClick={() => setIsEditingUrl(false)}
                          className="px-2.5 py-1 text-xs text-[var(--color-text-muted)] hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveCustomUrl}
                          className="px-3 py-1 text-xs bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-semibold rounded"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="text-[var(--color-text-muted)] text-[11px] mt-2 max-w-[240px] mx-auto leading-relaxed">
                    Escaneá el QR desde la cámara o compartí el link por WhatsApp
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </motion.div>

          {/* Right: Players & Teams Setup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-6 sm:p-8"
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
                      <p className="text-[var(--color-text-muted)] text-sm">Esperando que se unan los jugadores...</p>
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
