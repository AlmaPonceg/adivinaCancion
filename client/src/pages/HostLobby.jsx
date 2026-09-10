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
  const [connectionStatus, setConnectionStatus] = useState(socket.connected ? 'connected' : 'connecting');

  // ── Playlist State ──────────────────────────────────────────
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

  // ── Manual Player State ─────────────────────────────────────
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
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trivia_base_url');
      if (!saved) {
        fetch('/api/config')
          .then((res) => res.json())
          .then((data) => {
            if (data?.localIp && data.localIp !== 'localhost') {
              const detected = `http://${data.localIp}:${window.location.port || 5173}`;
              setBaseUrl(detected);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  // ── Robust Room Creation & Connection ───────────────────────
  useEffect(() => {
    let mounted = true;

    const handleConnect = () => {
      if (!mounted) return;
      setConnectionStatus('connected');
      requestRoom();
    };

    const handleDisconnect = () => {
      if (!mounted) return;
      setConnectionStatus('disconnected');
    };

    const handleRoomCreated = (data) => {
      if (!mounted) return;
      if (data?.code) {
        setRoomCode(data.code);
        setConnectionStatus('connected');
      }
    };

    const requestRoom = () => {
      if (!mounted) return;
      socket.emit('create-room', (response) => {
        if (!mounted) return;
        if (response?.code) {
          setRoomCode(response.code);
          setConnectionStatus('connected');
        }
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room-created', handleRoomCreated);

    if (socket.connected) {
      requestRoom();
    } else {
      socket.connect();
    }

    // Active retry timer if roomCode remains null
    const retryInterval = setInterval(() => {
      if (!mounted) return;
      setRoomCode((curr) => {
        if (!curr) {
          if (socket.connected) {
            requestRoom();
          } else {
            socket.connect();
          }
        }
        return curr;
      });
    }, 1500);

    return () => {
      mounted = false;
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room-created', handleRoomCreated);
      clearInterval(retryInterval);
    };
  }, []);

  useSocketEvent('player-list-updated', (playerList) => {
    setPlayers(playerList);
  });

  useSocketEvent('teams-assigned', (data) => {
    setTeams(data.teams);
    setIsShuffling(false);
  });

  // ── Shuffle Teams (Max 4 per team) ──────────────────────────
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

  // ── Move Player Manual Reallocation ─────────────────────────
  const handleMovePlayer = (playerId, targetTeamIndex) => {
    socket.emit('move-player-team', { roomCode, playerId, targetTeamIndex }, (res) => {
      if (res?.error) {
        alert(res.error);
      }
    });
  };

  // ── Add Manual Player ───────────────────────────────────────
  const handleAddManualPlayer = (e) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    setManualError('');
    socket.emit('add-manual-player', { roomCode, playerName: manualName.trim() }, (res) => {
      if (res?.error) {
        setManualError(res.error);
      } else {
        setManualName('');
      }
    });
  };

  const handleRemoveManualPlayer = (playerId) => {
    socket.emit('remove-manual-player', { roomCode, playerId });
  };

  // ── Playlist Management ─────────────────────────────────────
  const handleAddPlaylistUrls = () => {
    if (!playlistInput.trim()) return;
    const lines = playlistInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

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
      `¡Unite a la Trivia Musical de Cumpleaños! Sala: ${roomCode}. Tocá acá para entrar con tu celular: ${joinUrl}`
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

  const handleManualRetryRoom = () => {
    socket.connect();
    socket.emit('create-room', (response) => {
      if (response?.code) setRoomCode(response.code);
    });
  };

  return (
    <div className="min-h-dvh p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Top Navigation / Header Bar */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => navigate('/')}
                className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
              >
                ← Inicio
              </button>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                Panel Anfitrión
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Sala de Espera y Configuración
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Compartí el código o QR para que cada invitado se una desde su teléfono.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="nm-flat-sm px-3.5 py-1.5 rounded-xl flex items-center gap-2 border border-slate-200/80">
              <span className={`w-2.5 h-2.5 rounded-full ${roomCode ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="mono text-xs font-black text-slate-700">
                {roomCode ? `SALA ${roomCode}` : 'CONECTANDO...'}
              </span>
            </div>
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
              className="nm-flat p-6 sm:p-8 rounded-3xl flex flex-col items-center text-center relative overflow-hidden"
            >
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-extrabold uppercase tracking-wider mb-4">
                Código para unirse
              </div>

              {roomCode ? (
                <>
                  {/* Big Bold Digits */}
                  <div className="flex gap-2.5 mb-6">
                    {roomCode.split('').map((digit, i) => (
                      <motion.span
                        key={i}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.08 }}
                        className="mono w-14 h-18 sm:w-16 sm:h-20 bg-slate-50 border-2 border-indigo-100 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-black text-indigo-600 shadow-sm"
                      >
                        {digit}
                      </motion.span>
                    ))}
                  </div>

                  {/* Share buttons */}
                  <div className="w-full grid grid-cols-2 gap-3 mb-6">
                    <button
                      onClick={handleShareWhatsApp}
                      className="py-3 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.961.897 2.796.897 3.182 0 5.769-2.587 5.769-5.766.001-3.181-2.586-5.766-5.769-5.766zm9.969 5.766c0 5.514-4.486 10-10 10-1.745 0-3.376-.452-4.801-1.241l-5.2 1.361 1.385-5.066c-.928-1.503-1.464-3.267-1.464-5.054 0-5.514 4.486-10 10-10 5.514 0 10 4.486 10 10z" />
                      </svg>
                      WhatsApp
                    </button>

                    <button
                      onClick={handleCopyLink}
                      className="nm-btn py-3 px-3 rounded-xl font-bold text-xs text-slate-700 flex items-center justify-center gap-1.5"
                    >
                      {copied ? (
                        <span className="text-emerald-600 font-bold">¡Copiado!</span>
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
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl mb-4 flex flex-col items-center">
                    <QRDisplay value={joinUrl} size={170} />
                    <p className="text-[11px] font-semibold text-slate-500 mt-2">
                      Escaneá con la cámara del celular
                    </p>
                  </div>

                  {/* URL Config */}
                  <div className="w-full">
                    {!isEditingUrl ? (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                        <span className="mono truncate max-w-[240px]">{joinUrl}</span>
                        <button
                          onClick={() => {
                            setUrlInput(baseUrl);
                            setIsEditingUrl(true);
                          }}
                          className="text-indigo-600 font-bold hover:underline cursor-pointer ml-1"
                        >
                          (cambiar)
                        </button>
                      </div>
                    ) : (
                      <div className="nm-inset p-3 rounded-xl text-left space-y-2 bg-slate-50">
                        <span className="text-[11px] font-bold text-slate-600">URL del servidor / deploy:</span>
                        <input
                          type="text"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://tu-app.onrender.com"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setIsEditingUrl(false)}
                            className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 font-semibold"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveCustomUrl}
                            className="nm-btn-primary px-3 py-1.5 text-xs font-bold"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-semibold text-slate-600">
                    Generando código y código QR...
                  </p>
                  <button
                    onClick={handleManualRetryRoom}
                    className="nm-btn px-4 py-2 text-xs font-bold text-indigo-600 mt-2"
                  >
                    Reintentar conexión
                  </button>
                </div>
              )}
            </motion.div>

            {/* PRECARGA DE PLAYLIST */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="nm-flat p-6 rounded-3xl"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Playlist de Canciones
                  </span>
                  <span className="mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {playlist.length} {playlist.length === 1 ? 'canción' : 'canciones'}
                  </span>
                </div>

                <button
                  onClick={() => setShowPlaylistDrawer(!showPlaylistDrawer)}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  {showPlaylistDrawer ? 'Cerrar' : '+ Cargar lista'}
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-3">
                Pegá los enlaces de YouTube antes de empezar. Sonarán únicamente en esta computadora (Bluetooth).
              </p>

              {showPlaylistDrawer && (
                <div className="space-y-3 pt-2">
                  <textarea
                    rows={3}
                    value={playlistInput}
                    onChange={(e) => setPlaylistInput(e.target.value)}
                    placeholder="Pegá URLs de YouTube (una por línea)"
                    className="w-full p-3 text-xs rounded-xl border border-slate-300"
                  />
                  <div className="flex justify-between items-center">
                    {playlist.length > 0 && (
                      <button
                        onClick={handleClearPlaylist}
                        className="text-xs text-rose-600 hover:underline cursor-pointer font-semibold"
                      >
                        Vaciar todo
                      </button>
                    )}
                    <button
                      onClick={handleAddPlaylistUrls}
                      className="nm-btn-primary px-4 py-2 text-xs font-bold ml-auto"
                    >
                      + Guardar Canciones
                    </button>
                  </div>
                </div>
              )}

              {/* Playlist items list preview */}
              {playlist.length > 0 && (
                <div className="nm-inset p-3 rounded-2xl mt-3 max-h-44 overflow-y-auto space-y-1.5 bg-slate-50">
                  {playlist.map((url, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white border border-slate-200/60 shadow-xs"
                    >
                      <span className="mono truncate max-w-[230px] text-slate-700 font-medium">
                        {idx + 1}. {url}
                      </span>
                      <button
                        onClick={() => handleRemovePlaylistItem(idx)}
                        className="text-slate-400 hover:text-rose-600 ml-2 font-bold px-1"
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
              className="nm-flat p-6 sm:p-8 rounded-3xl"
            >
              {/* Header: Connected count & Teams rule */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Jugadores y Equipos
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {players.length} participante{players.length === 1 ? '' : 's'} conectados · Máximo 4 por equipo
                  </p>
                </div>

                <span className="mono text-xs font-black px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  LÍMITE: 4 / EQUIPO
                </span>
              </div>

              {/* CARGA MANUAL DE JUGADORES */}
              <form onSubmit={handleAddManualPlayer} className="p-2 bg-slate-50 border border-slate-200 rounded-2xl mb-6 flex gap-2">
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Nombre de invitado sin teléfono..."
                  className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent border-none shadow-none focus:outline-none"
                />
                <button
                  type="submit"
                  className="nm-btn px-4 py-2 font-bold text-xs text-indigo-600 shrink-0"
                >
                  + Cargar Manual
                </button>
              </form>
              {manualError && (
                <p className="text-xs text-rose-600 font-bold mb-4">{manualError}</p>
              )}

              {/* Roster or Teams View */}
              {!teams ? (
                <div>
                  <p className="label mb-3">Lista de espera ({players.length})</p>
                  <div className="nm-inset p-3 rounded-2xl min-h-[180px] max-h-72 overflow-y-auto space-y-2 mb-6 bg-slate-50">
                    <AnimatePresence>
                      {players.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-sm font-semibold text-slate-600 mb-1">
                            Aún no hay jugadores conectados
                          </p>
                          <p className="text-xs text-slate-400">
                            Escaneen el QR con la cámara del celular para ingresar.
                          </p>
                        </div>
                      ) : (
                        players.map((player) => (
                          <motion.div
                            key={player.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/70 shadow-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                                {player.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="font-bold text-sm text-slate-800">{player.name}</span>
                              {player.isManual && (
                                <span className="text-[10px] uppercase font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                                  Manual
                                </span>
                              )}
                            </div>

                            {player.isManual && (
                              <button
                                onClick={() => handleRemoveManualPlayer(player.id)}
                                className="text-slate-400 hover:text-rose-600 text-xs font-bold px-2 py-1"
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
                    <p className="label">Equipos asignados (balanceados, máx. 4 c/u)</p>
                    <span className="text-xs text-slate-500">
                      Podés reasignar jugadores usando el selector
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
                    className="nm-btn-primary flex-1 py-4 rounded-2xl text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2 shadow-md"
                  >
                    {isShuffling ? 'Sorteando...' : '🎲 Sortear Equipos (Máx. 4 por equipo)'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleShuffle}
                      className="nm-btn flex-1 py-3.5 rounded-2xl text-xs font-bold text-slate-700"
                    >
                      🎲 Volver a sortear
                    </button>

                    <button
                      onClick={handleStartGame}
                      className="nm-btn-primary flex-1 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-1.5 shadow-md"
                    >
                      Iniciar Partida →
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
