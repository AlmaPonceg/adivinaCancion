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

  // ── Playlist State (Requirement 2) ──────────────────────────
  const [playlist, setPlaylist] = useState(() => {
    try {
      const saved = localStorage.getItem('trivia_playlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [playlistInput, setPlaylistInput] = useState('');
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState(false);

  // ── Manual Player State (Requirement 3) ─────────────────────
  const [manualName, setManualName] = useState('');
  const [manualError, setManualError] = useState('');

  // ── URL & Sharing State ─────────────────────────────────────
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

  // ── Shuffle Teams (Requirement 4: Max 4 per team) ───────────
  const handleShuffle = async () => {
    if (players.length < 2) return;
    setIsShuffling(true);
    try {
      await emit('shuffle-teams', { roomCode });
    } catch (err) {
      console.error('Shuffle error:', err);
      setIsShuffling(false);
    }
  };

  // ── Move Player Manual Reallocation (Requirement 4) ─────────
  const handleMovePlayer = (playerId, targetTeamIndex) => {
    socket.emit('move-player-team', { roomCode, playerId, targetTeamIndex }, (res) => {
      if (res?.error) {
        alert(res.error);
      }
    });
  };

  // ── Add Manual Player (Requirement 3) ───────────────────────
  const handleAddManualPlayer = (e) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    setManualError('');
    socket.emit('add-manual-player', { roomCode, playerName: manualName.trim() }, (res) => {
      if (res.error) {
        setManualError(res.error);
      } else {
        setManualName('');
      }
    });
  };

  const handleRemoveManualPlayer = (playerId) => {
    socket.emit('remove-manual-player', { roomCode, playerId });
  };

  // ── Playlist Management (Requirement 2) ─────────────────────
  const handleAddPlaylistUrls = () => {
    if (!playlistInput.trim()) return;
    const lines = playlistInput
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);

    const updated = [...playlist, ...lines];
    setPlaylist(updated);
    localStorage.setItem('trivia_playlist', JSON.stringify(updated));
    setPlaylistInput('');
  };

  const handleRemovePlaylistItem = (index) => {
    const updated = playlist.filter((_, idx) => idx !== index);
    setPlaylist(updated);
    localStorage.setItem('trivia_playlist', JSON.stringify(updated));
  };

  const handleClearPlaylist = () => {
    setPlaylist([]);
    localStorage.removeItem('trivia_playlist');
  };

  // ── Start Game Navigation ───────────────────────────────────
  const handleStartGame = () => {
    navigate('/host/game', { state: { roomCode, teams, playlist } });
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
      `¡Unite a la Trivia Musical! Sala: ${roomCode}. Tocá acá para entrar: ${joinUrl}`
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
    <div className="min-h-dvh p-4 sm:p-8 bg-[var(--nm-bg)]">
      <div className="max-w-6xl mx-auto">
        {/* Header Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              Trivia Musical
            </h1>
            <p className="text-[var(--color-text-muted)] text-xs sm:text-sm mt-0.5">
              Panel de Administración y Lobby
            </p>
          </div>

          <div className="nm-flat-sm px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="mono text-xs font-bold text-[var(--color-text-primary)]">
              LOBBY
            </span>
          </div>
        </motion.div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Room Code, QR, Sharing & Playlist (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Room Code & QR Card */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              className="nm-flat p-6 sm:p-8 rounded-2xl flex flex-col items-center text-center"
            >
              <span className="label mb-3">Código de sala</span>

              {roomCode ? (
                <>
                  <div className="flex gap-2.5 mb-6">
                    {roomCode.split('').map((digit, i) => (
                      <span
                        key={i}
                        className="mono nm-inset w-12 h-16 sm:w-14 sm:h-18 flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-[var(--color-accent)] rounded-xl"
                      >
                        {digit}
                      </span>
                    ))}
                  </div>

                  {/* Share buttons */}
                  <div className="w-full grid grid-cols-2 gap-3 mb-6">
                    <button
                      onClick={handleShareWhatsApp}
                      className="nm-btn py-3 px-3 rounded-xl font-bold text-xs text-emerald-700 flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.961.897 2.796.897 3.182 0 5.769-2.587 5.769-5.766.001-3.181-2.586-5.766-5.769-5.766zm9.969 5.766c0 5.514-4.486 10-10 10-1.745 0-3.376-.452-4.801-1.241l-5.2 1.361 1.385-5.066c-.928-1.503-1.464-3.267-1.464-5.054 0-5.514 4.486-10 10-10 5.514 0 10 4.486 10 10z"/>
                      </svg>
                      WhatsApp
                    </button>

                    <button
                      onClick={handleCopyLink}
                      className="nm-btn py-3 px-3 rounded-xl font-bold text-xs text-[var(--color-text-secondary)] flex items-center justify-center gap-1.5"
                    >
                      {copied ? (
                        <span className="text-emerald-700 font-bold">¡Copiado!</span>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copiar link
                        </>
                      )}
                    </button>
                  </div>

                  {/* QR Display */}
                  <div className="nm-inset p-4 rounded-2xl mb-4">
                    <QRDisplay value={joinUrl} size={160} />
                  </div>

                  {/* URL Config */}
                  <div className="w-full">
                    {!isEditingUrl ? (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                        <span className="mono truncate max-w-[220px]">{joinUrl}</span>
                        <button
                          onClick={() => {
                            setUrlInput(baseUrl);
                            setIsEditingUrl(true);
                          }}
                          className="text-[var(--color-accent)] font-semibold hover:underline cursor-pointer"
                        >
                          (editar)
                        </button>
                      </div>
                    ) : (
                      <div className="nm-inset p-3 rounded-xl text-left space-y-2">
                        <span className="label text-[10px]">URL base de la app / deploy:</span>
                        <input
                          type="text"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://tu-app.onrender.com"
                          className="w-full px-3 py-1.5 text-xs"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setIsEditingUrl(false)}
                            className="text-xs text-[var(--color-text-muted)] hover:text-black px-2 py-1"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveCustomUrl}
                            className="nm-btn-primary px-3 py-1 text-xs"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </motion.div>

            {/* PRECARGA DE PLAYLIST (Requirement 2) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="nm-flat p-6 rounded-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="label">Cola de Canciones (Playlist)</span>
                  <span className="mono text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {playlist.length} lista{playlist.length === 1 ? '' : 's'}
                  </span>
                </div>

                <button
                  onClick={() => setShowPlaylistDrawer(!showPlaylistDrawer)}
                  className="text-xs font-bold text-[var(--color-accent)] hover:underline"
                >
                  {showPlaylistDrawer ? 'Ocultar' : 'Cargar / Editar'}
                </button>
              </div>

              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                Pegá los enlaces de YouTube antes de empezar para no tener que cargarlos uno a uno durante el juego.
              </p>

              {showPlaylistDrawer && (
                <div className="space-y-3 pt-2">
                  <textarea
                    rows={3}
                    value={playlistInput}
                    onChange={(e) => setPlaylistInput(e.target.value)}
                    placeholder="Pegá una o varias URLs de YouTube (una por línea)"
                    className="w-full p-3 text-xs"
                  />
                  <div className="flex justify-between items-center">
                    {playlist.length > 0 && (
                      <button
                        onClick={handleClearPlaylist}
                        className="text-xs text-rose-600 hover:underline cursor-pointer"
                      >
                        Vaciar cola
                      </button>
                    )}
                    <button
                      onClick={handleAddPlaylistUrls}
                      className="nm-btn-primary px-4 py-2 text-xs font-bold ml-auto"
                    >
                      + Cargar a la Playlist
                    </button>
                  </div>
                </div>
              )}

              {/* Playlist items list preview */}
              {playlist.length > 0 && (
                <div className="nm-inset p-3 rounded-xl mt-3 max-h-40 overflow-y-auto space-y-1.5">
                  {playlist.map((url, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/40"
                    >
                      <span className="mono truncate max-w-[240px] text-[var(--color-text-secondary)]">
                        {idx + 1}. {url}
                      </span>
                      <button
                        onClick={() => handleRemovePlaylistItem(idx)}
                        className="text-rose-500 hover:text-rose-700 ml-2 font-bold"
                        title="Eliminar canción"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Jugadores, Carga Manual y Equipos (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="nm-flat p-6 sm:p-8 rounded-2xl"
            >
              {/* Header: Connected count & Teams rule */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Jugadores y Equipos</h2>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {players.length} participante{players.length === 1 ? '' : 's'} · Máx. 4 por equipo
                  </p>
                </div>

                <div className="nm-inset-sm px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--color-text-secondary)]">
                  Límite: 4 por equipo
                </div>
              </div>

              {/* CARGA MANUAL DE JUGADORES (Requirement 3) */}
              <form onSubmit={handleAddManualPlayer} className="nm-inset p-3.5 rounded-xl mb-6 flex gap-2">
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Nombre de invitado sin celular..."
                  className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent border-none shadow-none focus:ring-0"
                />
                <button
                  type="submit"
                  className="nm-btn px-4 py-2 font-bold text-xs text-[var(--color-accent)] shrink-0"
                >
                  + Cargar Manual
                </button>
              </form>
              {manualError && (
                <p className="text-xs text-rose-600 font-medium mb-4">{manualError}</p>
              )}

              {/* Roster or Teams View */}
              {!teams ? (
                <div>
                  <p className="label mb-3">Lista de espera</p>
                  <div className="nm-inset p-4 rounded-xl min-h-[160px] max-h-72 overflow-y-auto space-y-2 mb-6">
                    <AnimatePresence>
                      {players.length === 0 ? (
                        <div className="text-center py-10">
                          <p className="text-sm text-[var(--color-text-muted)]">
                            Esperando que se unan los jugadores con el link o ingresalos manualmente arriba.
                          </p>
                        </div>
                      ) : (
                        players.map((player) => (
                          <motion.div
                            key={player.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-white/50 shadow-sm"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                {player.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="font-semibold text-sm">{player.name}</span>
                              {player.isManual && (
                                <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                  Manual
                                </span>
                              )}
                            </div>

                            {player.isManual && (
                              <button
                                onClick={() => handleRemoveManualPlayer(player.id)}
                                className="text-xs text-rose-500 hover:text-rose-700 font-bold px-1"
                                title="Eliminar jugador manual"
                              >
                                ✕
                              </button>
                            )}
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="label">Equipos conformados (editables a mano)</p>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      Podés cambiar jugadores de equipo con el selector
                    </span>
                  </div>

                  <TeamDisplay teams={teams} onMovePlayer={handleMovePlayer} />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {!teams ? (
                  <button
                    onClick={handleShuffle}
                    disabled={players.length < 2 || isShuffling}
                    className="nm-btn-primary flex-1 py-3.5 rounded-xl text-sm font-bold disabled:opacity-40"
                  >
                    {isShuffling ? 'Sorteando...' : '🎲 Sortear Equipos (Máx 4 por equipo)'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleShuffle}
                      className="nm-btn flex-1 py-3.5 rounded-xl text-xs font-bold text-[var(--color-text-secondary)]"
                    >
                      🎲 Volver a sortear
                    </button>

                    <button
                      onClick={handleStartGame}
                      className="nm-btn-primary flex-1 py-3.5 rounded-xl text-sm font-bold"
                    >
                      Iniciar Juego →
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
