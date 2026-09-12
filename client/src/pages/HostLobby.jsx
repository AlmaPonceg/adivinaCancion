import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';
import { useSocketEvent, useSocketEmit } from '../hooks/useSocket';
import QRDisplay from '../components/QRDisplay';
import TeamDisplay from '../components/TeamDisplay';
import LobbyAudio from '../components/LobbyAudio';
import { lobbyAudioManager } from '../utils/lobbyAudio';
import {
  saveAudioFile,
  deleteAudioFile,
  clearAudioFiles,
  createTrackObjectUrl,
  revokeTrackObjectUrl,
  hydratePlaylistTracks,
} from '../utils/audioStorage';
import { normalizeTrack, getTrackTitle } from '../utils/trackHelper';

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
  const [playlistTab, setPlaylistTab] = useState('local'); // 'local' | 'urls'
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);

  // Hydrate local tracks from IndexedDB with active Object URLs on mount
  useEffect(() => {
    let isMounted = true;
    async function hydrate() {
      if (playlist && playlist.length > 0) {
        const hydrated = await hydratePlaylistTracks(playlist);
        if (isMounted) setPlaylist(hydrated);
      }
    }
    hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Manual Player State ─────────────────────────────────────
  const [manualName, setManualName] = useState('');
  const [manualError, setManualError] = useState('');

  // ── URL & Sharing State ─────────────────────────────────────
  // Default to Render URL so QR codes and WhatsApp links NEVER contain localhost or local ports
  const DEFAULT_RENDER_URL = 'https://advinacancion.onrender.com';

  const [baseUrl, setBaseUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trivia_base_url');
      if (saved) return saved;

      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
      if (!isLocal) {
        return window.location.origin;
      }
      return DEFAULT_RENDER_URL;
    }
    return DEFAULT_RENDER_URL;
  });
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSpawningBots, setIsSpawningBots] = useState(false);

  const handleSpawnBots = () => {
    if (!roomCode || isSpawningBots) return;
    setIsSpawningBots(true);
    socket.emit('spawn-bots', { roomCode, count: 100 }, () => {
      setTimeout(() => setIsSpawningBots(false), 2500);
    });
  };

  // Sync baseUrl with backend config / Render detection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

      fetch('/api/config')
        .then((res) => res.json())
        .then((data) => {
          if (data?.publicUrl) {
            setBaseUrl(data.publicUrl);
            return;
          }
          if (!isLocal) {
            setBaseUrl(window.location.origin);
            return;
          }
          const saved = localStorage.getItem('trivia_base_url');
          if (saved) {
            setBaseUrl(saved);
          } else {
            setBaseUrl(DEFAULT_RENDER_URL);
          }
        })
        .catch(() => {});
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

  // ── Rename Team ─────────────────────────────────────────────
  const handleRenameTeam = (teamIndex, newName) => {
    socket.emit('rename-team', { roomCode, teamIndex, newName }, (res) => {
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

  // ── Playlist Management (Offline Local Audio + Web URLs) ────
  const savePlaylistToStorage = (tracks) => {
    const persistable = tracks.map((t) => {
      if (typeof t === 'object') {
        return {
          id: t.id,
          type: t.type,
          name: t.name,
          url: t.type === 'local' ? '' : t.url,
          size: t.size,
          fileId: t.fileId || t.id,
        };
      }
      return t;
    });
    localStorage.setItem('trivia_playlist', JSON.stringify(persistable));
  };

  const handleAddPlaylistUrls = async () => {
    if (!playlistInput.trim()) return;
    const lines = playlistInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

    if (lines.length === 0) return;

    // Check if it's a playlist URL or a bunch of song names
    const isSinglePlaylistUrl = lines.length === 1 && (lines[0].includes('list=') || lines[0].includes('playlist?list='));
    const isTextList = !isSinglePlaylistUrl && !lines.some(l => l.startsWith('http://') || l.startsWith('https://'));

    if (isSinglePlaylistUrl || isTextList) {
      setIsLoadingPlaylist(true);
      try {
        const serverUrl = socket.io.uri;
        const bodyData = isSinglePlaylistUrl ? { url: lines[0] } : { queries: lines };
        
        const res = await fetch(`${serverUrl}/api/playlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });
        const data = await res.json();
        
        if (data.success && data.videos) {
          const newTracks = data.videos.map(v => ({
            type: 'youtube',
            id: v.id,
            name: v.title,
            url: v.url
          }));
          const updated = [...playlist, ...newTracks];
          setPlaylist(updated);
          savePlaylistToStorage(updated);
          setPlaylistInput('');
        } else {
          alert(data.error || 'Error al cargar la playlist');
        }
      } catch (e) {
        alert('Error de red al conectar con el servidor para procesar las canciones');
      } finally {
        setIsLoadingPlaylist(false);
      }
      return;
    }

    // Default behavior for normal YouTube links
    const newTracks = lines.map((url) => normalizeTrack(url));
    const updated = [...playlist, ...newTracks];
    setPlaylist(updated);
    savePlaylistToStorage(updated);
    setPlaylistInput('');
  };

  const handleUploadLocalFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files || files.length === 0) return;

    const newTracks = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `local_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
      await saveAudioFile(fileId, file);
      const url = createTrackObjectUrl(fileId, file);
      newTracks.push({
        id: fileId,
        type: 'local',
        name: file.name,
        url,
        size: file.size,
        fileId,
      });
    }

    const updated = [...playlist, ...newTracks];
    setPlaylist(updated);
    savePlaylistToStorage(updated);
    e.target.value = '';
  };

  const handleRemovePlaylistItem = async (index) => {
    const itemToRemove = playlist[index];
    if (itemToRemove && typeof itemToRemove === 'object' && itemToRemove.fileId) {
      await deleteAudioFile(itemToRemove.fileId);
      revokeTrackObjectUrl(itemToRemove.fileId);
    }
    const updated = playlist.filter((_, idx) => idx !== index);
    setPlaylist(updated);
    savePlaylistToStorage(updated);
  };

  const handleClearPlaylist = async () => {
    await clearAudioFiles();
    setPlaylist([]);
    localStorage.removeItem('trivia_playlist');
  };

  // ── Start Game Navigation ───────────────────────────────────
  const handleStartGame = () => {
    try {
      localStorage.setItem('trivia_host_room', roomCode);
      localStorage.setItem('trivia_teams', JSON.stringify(teams || []));
      savePlaylistToStorage(playlist || []);
    } catch {
      /* ignore */
    }
    lobbyAudioManager.stop();
    socket.emit('host-start-game', { roomCode });
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
      formatted = formatted.replace(/\/+$/, '');
      setBaseUrl(formatted);
      localStorage.setItem('trivia_base_url', formatted);
    } else {
      const fallback =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? DEFAULT_RENDER_URL
          : window.location.origin;
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
    <div className="min-h-dvh p-3.5 sm:p-6 md:p-8 text-[var(--color-text-primary)]">
      <div className="max-w-6xl mx-auto">
        {/* Top Navigation / Header Bar */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <button
                onClick={() => navigate('/')}
                className="arcade-btn px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-black text-[#181226] hover:text-[#FF5722] flex items-center gap-2 cursor-pointer shadow-xs active:translate-y-0.5 transition-all"
              >
                <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Volver al Inicio</span>
              </button>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E8DFD1] text-xs font-semibold text-[#181226] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-pulse" />
                <span className="font-bold text-[#181226]">Pantalla del Host</span>
                <span className="text-[#D1C9BD]">·</span>
                <span className="text-[#6B6280] font-medium">Cumple de Alma</span>
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-[#181226]">
              Lobby de Equipos
            </h1>
            <p className="text-[#6B6280] text-xs sm:text-sm mt-0.5">
              Compartí el código o QR para que los invitados se sumen desde el celular.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <button
              id="spawn-bots-btn"
              onClick={handleSpawnBots}
              disabled={isSpawningBots || !roomCode}
              title="Simular 100 bots de prueba para test de carga y estrés en vivo"
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl flex items-center gap-2 bg-gradient-to-r from-[#FF5722] to-[#FF8A65] hover:from-[#E64A19] hover:to-[#FF7043] text-white text-xs font-black cursor-pointer shadow-sm active:translate-y-0.5 transition-all disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{isSpawningBots ? 'Conectando 100 bots...' : 'Simular 100 Bots'}</span>
            </button>
            <LobbyAudio />
            <div className="p-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl flex items-center gap-2.5 bg-white border border-[#EAE3D5] shadow-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${roomCode ? 'bg-[#059669] shadow-[0_0_8px_#059669]' : 'bg-[#D97706]'}`} />
              <span className="mono text-xs font-black text-[#181226]">
                {roomCode ? `SALA ${roomCode}` : 'CONECTANDO...'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* LEFT COLUMN: Room Code, QR, Sharing & Playlist (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Room Code & QR Card */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              className="party-card p-5 sm:p-7 md:p-8 rounded-[2rem] flex flex-col items-center text-center relative overflow-hidden"
            >
              <div className="flex items-center justify-center gap-2.5 mb-4">
                <span className="h-px w-6 bg-[#E5DFD5]" />
                <span className="badge-tag text-[#FF5722] text-[10px] sm:text-xs">
                  CÓDIGO DE LA SALA
                </span>
                <span className="h-px w-6 bg-[#E5DFD5]" />
              </div>

              {roomCode ? (
                <>
                  {/* Big Bold Digits (Billboard Display) */}
                  <div className="flex gap-2 sm:gap-3 mb-6 justify-center">
                    {roomCode.split('').map((digit, i) => (
                      <motion.span
                        key={i}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.08 }}
                        className="mono w-12 h-16 sm:w-14 sm:h-18 md:w-16 md:h-20 bg-[#FAF7F2] border-2 border-[#FF5722] rounded-2xl flex items-center justify-center text-2xl sm:text-3xl md:text-4xl font-black text-[#FF5722] shadow-[0_4px_12px_rgba(255,87,34,0.15)]"
                      >
                        {digit}
                      </motion.span>
                    ))}
                  </div>

                  {/* Share buttons */}
                  <div className="w-full grid grid-cols-2 gap-2.5 sm:gap-3 mb-6">
                    <button
                      onClick={handleShareWhatsApp}
                      className="arcade-btn-mint py-3 px-3 rounded-xl font-tactical font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.961.897 2.796.897 3.182 0 5.769-2.587 5.769-5.766.001-3.181-2.586-5.766-5.769-5.766zm9.969 5.766c0 5.514-4.486 10-10 10-1.745 0-3.376-.452-4.801-1.241l-5.2 1.361 1.385-5.066c-.928-1.503-1.464-3.267-1.464-5.054 0-5.514 4.486-10 10-10 5.514 0 10 4.486 10 10z" />
                      </svg>
                      WhatsApp
                    </button>

                    <button
                      onClick={handleCopyLink}
                      className="arcade-btn py-3 px-3 rounded-xl font-tactical font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copied ? (
                        <span className="text-[#059669] font-bold">¡Copiado!</span>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* QR Code */}
                  <div className="mb-4 p-3.5 rounded-2xl bg-white border border-[#EAE3D5] shadow-md">
                    <QRDisplay value={joinUrl} size={160} />
                  </div>

                  {/* URL Display with Manual Override button */}
                  <div className="w-full bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#EAE3D5] text-left">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-[#6B6280] uppercase tracking-wider">
                        Enlace de conexión:
                      </span>
                      <button
                        onClick={() => setIsEditingUrl(!isEditingUrl)}
                        className="text-[11px] font-bold text-[#FF5722] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {isEditingUrl ? 'Cerrar' : 'Cambiar IP/Host'}
                      </button>
                    </div>

                    <p className="mono text-xs text-[#181226] font-bold break-all select-all">
                      {joinUrl}
                    </p>

                    {/* Editor de IP / Host manual */}
                    {isEditingUrl && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 pt-3 border-t border-[#EAE3D5] space-y-2"
                      >
                        <p className="text-[11px] text-[#6B6280]">
                          Si estás en red local y el celular no conecta con localhost, poné la IP de tu PC (ej: <code>192.168.1.50</code> o tu túnel ngrok):
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="Ej: 192.168.1.15:5173 o mitunel.ngrok.io"
                            className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-[#EAE3D5] bg-white text-[#181226]"
                          />
                          <div className="flex gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => setIsEditingUrl(false)}
                              className="text-xs text-[#6B6280] hover:text-[#181226] px-2 py-1 font-semibold"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleSaveCustomUrl}
                              className="arcade-btn-primary px-3.5 py-1.5 text-xs font-bold"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="w-10 h-10 border-4 border-[#FF5722] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-semibold text-[#6B6280]">
                    Generando código y código QR...
                  </p>
                  <button
                    onClick={handleManualRetryRoom}
                    className="arcade-btn px-4 py-2 text-xs font-bold text-[#FF5722] mt-2"
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
              className="party-card p-6 rounded-3xl"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#181226]">
                    Playlist de Canciones
                  </span>
                  <span className="mono text-xs font-black px-2.5 py-0.5 rounded-full bg-[#FFF0EB] text-[#FF5722] border border-[#FF5722]/30">
                    {playlist.length} {playlist.length === 1 ? 'canción' : 'canciones'}
                  </span>
                </div>

                <button
                  onClick={() => setShowPlaylistDrawer(!showPlaylistDrawer)}
                  className="text-xs font-bold text-[#FF5722] hover:underline cursor-pointer"
                >
                  {showPlaylistDrawer ? 'Cerrar opciones' : '+ Agregar canciones'}
                </button>
              </div>

              <p className="text-xs text-[#6B6280] mb-3">
                Cargá archivos descargados (.mp3, .wav) para jugar 100% offline sin datos, o pegá enlaces web de YouTube.
              </p>

              {showPlaylistDrawer && (
                <div className="space-y-3 pt-2">
                  {/* Selector de modo: Archivos locales vs URLs */}
                  <div className="flex items-center p-1 bg-[#FAF7F2] rounded-xl border border-[#EAE3D5]">
                    <button
                      onClick={() => setPlaylistTab('local')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        playlistTab === 'local'
                          ? 'bg-[#059669] text-white shadow-xs'
                          : 'text-[#6B6280] hover:text-[#181226]'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span>Archivos de Audio (Sin Internet)</span>
                    </button>

                    <button
                      onClick={() => setPlaylistTab('urls')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        playlistTab === 'urls'
                          ? 'bg-[#FF5722] text-white shadow-xs'
                          : 'text-[#6B6280] hover:text-[#181226]'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span>URLs Web (YouTube)</span>
                    </button>
                  </div>

                  {/* Tab 1: Subir archivos de audio locales */}
                  {playlistTab === 'local' ? (
                    <div className="space-y-2">
                      <label className="border-2 border-dashed border-[#DDD5C5] hover:border-[#059669] bg-[#FAF7F2] hover:bg-[#F3EFE6] p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all text-center group">
                        <div className="w-11 h-11 rounded-xl bg-[#E6F9F0] border border-[#059669]/30 flex items-center justify-center text-[#059669] mb-2 group-hover:scale-105 transition-transform shadow-xs">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </div>
                        <p className="font-display text-xs sm:text-sm font-black text-[#181226] mb-0.5">
                          Hacé clic para seleccionar tus canciones (.mp3, .wav, .m4a)
                        </p>
                        <p className="text-[11px] text-[#6B6280] max-w-sm leading-tight">
                          Podés elegir varios archivos juntos desde tu computadora. Sonarán directamente desde tu disco sin consumir datos.
                        </p>
                        <input
                          type="file"
                          multiple
                          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                          onChange={handleUploadLocalFiles}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    /* Tab 2: Pegar URLs de YouTube / Spotify */
                    <div className="space-y-2">
                      <textarea
                        value={playlistInput}
                        onChange={(e) => setPlaylistInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddPlaylistUrls();
                          }
                        }}
                        placeholder="Pegá un link de YouTube acá (ej. una canción o una playlist entera)"
                        className="w-full bg-white border border-[#E0D9CB] rounded-xl px-4 py-3 text-sm font-semibold text-[#181226] focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] outline-none shadow-inner resize-none mb-3"
                        rows={3}
                      />
                      <button
                        onClick={handleAddPlaylistUrls}
                        disabled={!playlistInput.trim() || isLoadingPlaylist}
                        className="w-full arcade-btn-primary py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isLoadingPlaylist ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Buscando canciones originales...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span>Agregar Links a la Cola</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {playlist.length > 0 && (
                    <div className="flex justify-between items-center pt-1">
                      <button
                        onClick={handleClearPlaylist}
                        className="text-xs text-[#E11D48] hover:underline cursor-pointer font-bold"
                      >
                        Vaciar toda la lista
                      </button>
                      <span className="text-[11px] text-[#6B6280] font-medium">
                        {playlist.filter((t) => typeof t === 'object' && t.type === 'local').length} locales · {playlist.filter((t) => (typeof t === 'string' ? true : t.type !== 'local')).length} web
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Playlist items list preview */}
              {playlist.length > 0 && (
                <div className="console-inset p-3 rounded-2xl mt-3 max-h-52 overflow-y-auto space-y-2">
                  {playlist.map((track, idx) => {
                    const isLocal = typeof track === 'object' && track.type === 'local';
                    const title = getTrackTitle(track);
                    const sizeTxt =
                      typeof track === 'object' && track.size
                        ? ` (${(track.size / (1024 * 1024)).toFixed(1)} MB)`
                        : '';

                    return (
                      <div
                        key={track.id || idx}
                        className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-white border border-[#EAE3D5] shadow-2xs gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="mono text-[10px] font-black text-[#6B6280] shrink-0">
                            #{idx + 1}
                          </span>

                          {isLocal ? (
                            <span className="badge-tag bg-[#E6F9F0] text-[#059669] border border-[#059669]/40 px-1.5 py-0.5 rounded text-[9px] shrink-0">
                              LOCAL
                            </span>
                          ) : (
                            <span className="badge-tag bg-[#FFF0EB] text-[#FF5722] border border-[#FF5722]/30 px-1.5 py-0.5 rounded text-[9px] shrink-0">
                              URL
                            </span>
                          )}

                          <span className="truncate text-[#181226] font-bold text-xs" title={title}>
                            {title}
                            {sizeTxt && <span className="mono text-[10px] text-[#6B6280] font-normal">{sizeTxt}</span>}
                          </span>
                        </div>

                        <button
                          onClick={() => handleRemovePlaylistItem(idx)}
                          className="text-[#8E869E] hover:text-[#E11D48] p-1 shrink-0 cursor-pointer"
                          title="Eliminar canción"
                          aria-label="Eliminar canción"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Jugadores, Carga Manual y Equipos (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="party-card p-6 sm:p-8 rounded-[2rem]"
            >
              {/* Header: Connected count & Teams rule */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#EAE3D5]">
                <div>
                  <h2 className="font-display text-xl font-black text-[#181226]">
                    Jugadores y Equipos
                  </h2>
                  <p className="text-xs text-[#6B6280] mt-0.5">
                    {players.length} participante{players.length === 1 ? '' : 's'} conectados · Máximo 4 por equipo
                  </p>
                </div>

                <span className="mono text-xs font-black px-3 py-1 rounded-full bg-[#FFF0EB] text-[#FF5722] border border-[#FF5722]/30">
                  LÍMITE: 4 / EQUIPO
                </span>
              </div>

              {/* CARGA MANUAL DE JUGADORES */}
              <form onSubmit={handleAddManualPlayer} className="p-2 bg-[#FAF7F2] border border-[#EAE3D5] rounded-2xl mb-6 flex gap-2">
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Nombre de invitado sin teléfono..."
                  className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent border-none shadow-none focus:outline-none text-[#181226] placeholder:text-[#8E869E]"
                />
                <button
                  type="submit"
                  className="arcade-btn px-4 py-2 font-bold text-xs text-[#FF5722] shrink-0 cursor-pointer"
                >
                  + Cargar Manual
                </button>
              </form>
              {manualError && (
                <p className="text-xs text-[#E11D48] font-bold mb-4 bg-[#FFF0F3] p-2.5 rounded-xl border border-[#E11D48]/30">{manualError}</p>
              )}

              {/* Roster or Teams View */}
              {!teams ? (
                <div>
                  <p className="badge-tag text-[#6B6280] mb-3">Lista de espera ({players.length})</p>
                  <div className="console-inset p-3.5 rounded-2xl min-h-[180px] max-h-72 overflow-y-auto space-y-2 mb-6">
                      {players.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-sm font-semibold text-[#181226] mb-1">
                            Aún no hay jugadores conectados
                          </p>
                          <p className="text-xs text-[#6B6280]">
                            Escaneen el QR con la cámara del celular para ingresar.
                          </p>
                        </div>
                      ) : (
                        players.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-[#EAE3D5] shadow-2xs animate-fade-in"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#FF5722] to-[#E11D48] text-white flex items-center justify-center font-black text-xs shadow-xs">
                                {player.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="font-bold text-sm text-[#181226]">{player.name}</span>
                              {player.isManual && (
                                <span className="text-[10px] uppercase font-black bg-[#FFF0EB] text-[#FF5722] border border-[#FF5722]/30 px-2 py-0.5 rounded-md">
                                  Manual
                                </span>
                              )}
                            </div>

                            {player.isManual && (
                              <button
                                onClick={() => handleRemoveManualPlayer(player.id)}
                                className="text-[#8E869E] hover:text-[#E11D48] p-1.5 cursor-pointer"
                                title="Eliminar jugador manual"
                                aria-label="Eliminar jugador"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="badge-tag text-[#6B6280]">Equipos asignados (balanceados, máx. 4 c/u)</p>
                    <span className="text-xs text-[#6B6280]">
                      Podés reasignar jugadores usando el selector
                    </span>
                  </div>

                  <TeamDisplay teams={teams} onMovePlayer={handleMovePlayer} onRenameTeam={handleRenameTeam} />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {!teams ? (
                  <button
                    onClick={handleShuffle}
                    disabled={players.length < 2 || isShuffling}
                    className="arcade-btn-primary flex-1 py-4 rounded-2xl text-base font-black disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{isShuffling ? 'Sorteando...' : 'Sortear Equipos (Máx. 4 por equipo)'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleShuffle}
                      className="arcade-btn py-3.5 px-5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                      <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Volver a sortear</span>
                    </button>

                    {teams && teams.length > 0 && teams.every((t) => t.isReady) ? (
                      <button
                        onClick={handleStartGame}
                        className="arcade-btn-primary flex-1 py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                      >
                        <span>Iniciar Partida →</span>
                      </button>
                    ) : (
                      <div className="flex-1 py-2.5 px-4 rounded-2xl bg-[#FFFBEB] border border-[#F59E0B]/50 flex items-center justify-between gap-2 text-[#B45309]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] shadow-[0_0_8px_#D97706] shrink-0" />
                          <p className="text-xs font-bold leading-tight truncate">
                            Esperando confirmación ({teams ? teams.filter((t) => t.isReady).length : 0} de {teams ? teams.length : 0} listos)
                          </p>
                        </div>
                        <button
                          onClick={handleStartGame}
                          className="text-xs font-black underline text-[#B45309] hover:text-[#78350F] shrink-0 cursor-pointer"
                          title="Iniciar de todos modos si algún integrante no puede tocar el celular"
                        >
                          Forzar inicio
                        </button>
                      </div>
                    )}
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
