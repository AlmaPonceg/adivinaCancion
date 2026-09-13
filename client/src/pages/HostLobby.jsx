import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket, { SERVER_URL } from '../socket';
import { useSocketEvent, useSocketEmit } from '../hooks/useSocket';
import QRDisplay from '../components/QRDisplay';
import TeamDisplay from '../components/TeamDisplay';
import LobbyAudio from '../components/LobbyAudio';
import DjBotModal from '../components/DjBotModal';
import PlaylistLoadingModal from '../components/PlaylistLoadingModal';
import GameModeSelector, { GAME_MODES } from '../components/GameModeSelector';
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
  const [playlistTab, setPlaylistTab] = useState('search'); // 'search' | 'local' | 'urls'
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [antiSpoiler, setAntiSpoiler] = useState(() => {
    return localStorage.getItem('trivia_anti_spoiler') === 'true';
  });
  const [showClearPlaylistConfirm, setShowClearPlaylistConfirm] = useState(false);

  // ── Mode & Team Sizing ──────────────────────────────────────
  const [gameMode, setGameMode] = useState('teams'); // 'teams' | 'individual'
  const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState(4);
  const [teamSelectionMode, setTeamSelectionMode] = useState('auto'); // 'auto' | 'manual'
  const [autoHostEnabled, setAutoHostEnabled] = useState(false);
  const [isDjBotOpen, setIsDjBotOpen] = useState(false);
  const [isModeConfirmed, setIsModeConfirmed] = useState(false);

  const currentTheme = useMemo(() => {
    if (autoHostEnabled) return GAME_MODES.find(m => m.id === 'autohost') || GAME_MODES[0];
    if (gameMode === 'individual') return GAME_MODES.find(m => m.id === 'individual') || GAME_MODES[2];
    if (teamSelectionMode === 'manual') return GAME_MODES.find(m => m.id === 'manual') || GAME_MODES[1];
    return GAME_MODES.find(m => m.id === 'auto') || GAME_MODES[0];
  }, [autoHostEnabled, gameMode, teamSelectionMode]);

  const assignedPlayerIds = useMemo(() => {
    return new Set((teams || []).flatMap((t) => (t.players || []).map((p) => p.id)));
  }, [teams]);

  const unassignedPlayers = useMemo(() => {
    return players.filter((p) => !assignedPlayerIds.has(p.id));
  }, [players, assignedPlayerIds]);

  const totalAssignedPlayers = useMemo(() => {
    return (teams || []).reduce((acc, t) => acc + (t.players ? t.players.length : 0), 0);
  }, [teams]);

  const hasAssignedTeams = totalAssignedPlayers > 0;


  const handleConfirmGameModeFromSelector = (params) => {
    if (params.gameMode) {
      setGameMode(params.gameMode);
      socket.emit('set-game-mode', { roomCode, gameMode: params.gameMode }, (res) => {
        if (res?.teams) setTeams(res.teams);
      });
    }
    if (params.teamSelectionMode) {
      setTeamSelectionMode(params.teamSelectionMode);
      socket.emit('set-team-selection-mode', { roomCode, mode: params.teamSelectionMode }, (res) => {
        if (res?.teams) setTeams(res.teams);
      });
    }
    if (typeof params.autoHostEnabled === 'boolean') {
      setAutoHostEnabled(params.autoHostEnabled);
      socket.emit('set-auto-host', { roomCode, enabled: params.autoHostEnabled });
    }
    if (typeof params.maxPlayersPerTeam === 'number') {
      setMaxPlayersPerTeam(params.maxPlayersPerTeam);
      socket.emit('set-team-size', { roomCode, maxPlayersPerTeam: params.maxPlayersPerTeam }, (res) => {
        if (res?.teams) setTeams(res.teams);
      });
    }
    if (params.manualTeamsCount && params.teamSelectionMode === 'manual') {
      socket.emit('init-manual-teams', { roomCode, count: params.manualTeamsCount }, (res) => {
        if (res?.teams) setTeams(res.teams);
      });
    }
    setIsModeConfirmed(true);
  };

  // ── Song Search API State ───────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);

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
  const [showManualInput, setShowManualInput] = useState(false);

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

  useSocketEvent('room-mode-updated', (data) => {
    if (data.gameMode) setGameMode(data.gameMode);
    if (data.teams) setTeams(data.teams);
  });

  useSocketEvent('team-size-updated', (data) => {
    if (data.maxPlayersPerTeam) setMaxPlayersPerTeam(data.maxPlayersPerTeam);
  });

  useSocketEvent('team-selection-mode-updated', (data) => {
    if (data.teamSelectionMode) setTeamSelectionMode(data.teamSelectionMode);
    if (data.teams) setTeams(data.teams);
  });

  useSocketEvent('auto-host-updated', (data) => {
    if (typeof data.autoHostEnabled === 'boolean') setAutoHostEnabled(data.autoHostEnabled);
  });

  // ── Mode Switch & Team Size Sizing Handlers ──────────────────
  const handleSwitchGameMode = (mode) => {
    setGameMode(mode);
    socket.emit('set-game-mode', { roomCode, gameMode: mode }, (res) => {
      if (res?.teams) setTeams(res.teams);
    });
  };

  const handleSwitchTeamSelectionMode = (mode) => {
    setTeamSelectionMode(mode);
    socket.emit('set-team-selection-mode', { roomCode, mode }, (res) => {
      if (res?.teams) setTeams(res.teams);
    });
  };

  const handleToggleAutoHost = () => {
    const next = !autoHostEnabled;
    setAutoHostEnabled(next);
    socket.emit('set-auto-host', { roomCode, enabled: next });
  };

  const handleInitManualTeams = (count) => {
    const val = typeof count === 'number' ? count : parseInt(count, 10);
    const sanitized = isNaN(val) ? 2 : Math.max(2, Math.min(24, val));
    socket.emit('init-manual-teams', { roomCode, count: sanitized }, (res) => {
      if (res?.teams) setTeams(res.teams);
    });
  };

  const handleAddManualTeam = (teamName) => {
    socket.emit('add-manual-team', { roomCode, teamName }, (res) => {
      if (res?.teams) setTeams(res.teams);
    });
  };

  const handleRemoveManualTeam = (teamIndex) => {
    socket.emit('remove-manual-team', { roomCode, teamIndex }, (res) => {
      if (res?.teams) setTeams(res.teams);
    });
  };

  const handleChangeTeamSize = (size) => {
    const val = typeof size === 'number' ? size : parseInt(size, 10);
    const sanitized = isNaN(val) ? 4 : Math.max(0, Math.min(50, val));
    setMaxPlayersPerTeam(sanitized);
    socket.emit('set-team-size', { roomCode, maxPlayersPerTeam: sanitized }, (res) => {
      if (res?.teams) setTeams(res.teams);
    });
  };

  const handleDjBotGenerated = (generatedPlaylist) => {
    const updated = [...playlist, ...generatedPlaylist];
    setPlaylist(updated);
    savePlaylistToStorage(updated);
    setAntiSpoiler(true);
    try {
      localStorage.setItem('trivia_anti_spoiler', 'true');
    } catch {
      /* ignore */
    }
  };

  // ── Interactive Song Search with Live Debounced Suggestions ──
  const executeSearch = async (query, signal) => {
    const q = (query || '').trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setSearchError('');
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      const serverEndpoint = SERVER_URL || socket.io?.uri || window.location.origin;
      const res = await fetch(`${serverEndpoint}/api/search-songs?q=${encodeURIComponent(q)}`, {
        signal,
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
        setSearchError(data.error || 'No se encontraron sugerencias para esta búsqueda');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Search error:', err);
        setSearchError('Error de red al conectar con el servidor para buscar canciones');
      }
    } finally {
      if (!signal?.aborted) {
        setIsSearching(false);
      }
    }
  };

  // Live search effect: automatically triggers search after 350ms of inactivity
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setSearchError('');
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      executeSearch(q, controller.signal);
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleSearchSongs = (e) => {
    e?.preventDefault();
    executeSearch(searchQuery);
  };

  const handleAddSearchResult = (song) => {
    const track = {
      type: 'youtube',
      id: song.id,
      name: song.title,
      url: song.url,
      thumbnail: song.thumbnail,
      duration: song.duration,
      author: song.author,
    };
    const updated = [...playlist, track];
    setPlaylist(updated);
    savePlaylistToStorage(updated);
    setRecentlyAddedId(song.id);
    setTimeout(() => {
      setRecentlyAddedId((curr) => (curr === song.id ? null : curr));
    }, 2000);
  };

  // ── Shuffle Teams (Max per team or Individual) ──────────────
  const handleShuffle = async () => {
    if (players.length < 2 && gameMode !== 'individual') return;
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
          name: t.name || t.title,
          title: t.title || t.name,
          author: t.author || '',
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
    const rawInput = playlistInput.trim();
    if (!rawInput) return;
    const lines = rawInput
      .split(/[\n,]+/)
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter((s) => s.length > 3);

    if (lines.length === 0) return;

    // Check if it's a playlist URL or a list of song names
    const isSinglePlaylistUrl = lines.length === 1 && (
      lines[0].includes('list=') ||
      lines[0].includes('/playlist') ||
      /^[a-zA-Z0-9_-]{18,}$/.test(lines[0])
    );
    const isTextList = !isSinglePlaylistUrl && !lines.some(l => l.startsWith('http://') || l.startsWith('https://'));

    if (isSinglePlaylistUrl || isTextList) {
      setIsLoadingPlaylist(true);
      try {
        const serverEndpoint = SERVER_URL || socket.io?.uri || window.location.origin;
        const bodyData = isSinglePlaylistUrl ? { url: lines[0] } : { queries: lines };
        
        const res = await fetch(`${serverEndpoint}/api/playlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });
        const data = await res.json();
        
        if (data.success && data.videos && data.videos.length > 0) {
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

          // Automatically enable Anti-Spoiler mode so the host doesn't see the song titles
          if (isSinglePlaylistUrl) {
            setAntiSpoiler(true);
            localStorage.setItem('trivia_anti_spoiler', 'true');
          }
        } else {
          alert(data.error || 'No se pudieron cargar las canciones de la playlist.');
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

  const handleClearPlaylist = () => {
    setPlaylist([]);
    try {
      localStorage.removeItem('trivia_playlist');
    } catch {
      /* ignore */
    }
    clearAudioFiles().catch((e) => console.warn('Error clearing audio files:', e));
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
    navigate('/host/game', {
      state: {
        roomCode,
        teams,
        playlist,
        gameMode,
        teamSelectionMode,
        autoHostEnabled,
      },
    });
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

  if (!isModeConfirmed) {
    return (
      <div className="h-screen max-h-screen p-3 sm:p-4 md:p-6 flex items-center justify-center relative overflow-hidden text-[var(--color-text-primary)]">
        {/* Dynamic ambient color glow matching the current preview/mode */}
        <div
          className="absolute -top-12 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: currentTheme.color }}
        />
        <div
          className="absolute -bottom-12 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: currentTheme.color }}
        />

        <div className="w-full max-w-xl relative z-10 flex items-center justify-center">
          <GameModeSelector
            roomCode={roomCode}
            initialParams={{ gameMode, teamSelectionMode, autoHostEnabled, maxPlayersPerTeam }}
            onConfirm={handleConfirmGameModeFromSelector}
            onBack={() => navigate('/')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen p-3 sm:p-4 flex flex-col text-[var(--color-text-primary)] relative overflow-hidden">
      {/* Ambient background glow tailored to the active mode color */}
      <div
        className="absolute top-[-10%] left-[20%] w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-15 transition-all duration-700"
        style={{ backgroundColor: currentTheme.color }}
      />

      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col min-h-0 relative z-10">
        {/* ── Master Console Header Bar ────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 mb-2.5 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => navigate('/')}
              className="arcade-btn px-3 py-1.5 rounded-xl text-xs font-bold text-[#181226] hover:text-[#FF5722] flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Inicio</span>
            </button>

            <h1 className="font-display font-black text-sm sm:text-base text-[#181226] tracking-tight">
              Lobby de Equipos
            </h1>

            <div className="px-2.5 py-1 rounded-xl bg-white border border-[#DDD5C5] font-mono text-xs font-black text-[#181226] shadow-2xs flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${roomCode ? 'bg-[#059669]' : 'bg-[#D97706]'}`} />
              <span>{roomCode ? `SALA ${roomCode}` : 'CONECTANDO...'}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsModeConfirmed(false)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:brightness-95"
              style={{
                backgroundColor: currentTheme.colorLight,
                borderColor: currentTheme.colorBorder,
                color: currentTheme.colorText,
              }}
              title="Cambiar la modalidad de juego"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.color }} />
              <span>Modo: {currentTheme.shortName || currentTheme.name}</span>
              <span className="text-[10px] underline ml-0.5">Cambiar</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <LobbyAudio />
            <button
              id="spawn-bots-btn"
              onClick={handleSpawnBots}
              disabled={isSpawningBots || !roomCode}
              title="Simular 100 bots de prueba"
              className="arcade-btn px-3 py-1.5 rounded-xl text-xs font-bold text-[#6B6280] hover:text-[#FF5722] flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{isSpawningBots ? '100 bots...' : '+100 Bots'}</span>
            </button>
          </div>
        </div>

        {/* ── Main 2-Column Console Layout (Zero Scroll Grid) ────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 items-stretch overflow-hidden">
          {/* LEFT COLUMN: QR & Playlist (5 cols) */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-0 gap-2.5">
            {/* Upper Card: Room Access & QR Code */}
            <div className="party-card p-3 sm:p-3.5 rounded-2xl flex flex-col items-center justify-between shrink-0 shadow-sm">
              {roomCode ? (
                <>
                  {/* VIP Access Ribbon */}
                  <div className="w-full flex items-center justify-between px-2.5 py-1 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-[#181226] mb-2 shadow-2xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
                      <span className="font-tactical font-black text-[10px] tracking-widest uppercase text-[#6B6280]">
                        Acceso de Invitados
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#FF5722] font-black">
                      SALA {roomCode}
                    </span>
                  </div>

                  {/* 3D Physical Arcade Digit Tiles */}
                  <div className="flex gap-2 justify-center mb-2">
                    {roomCode.split('').map((digit, i) => (
                      <div
                        key={i}
                        className="relative flex flex-col items-center justify-center w-11 h-13 bg-white rounded-xl border-2 border-[#FF5722] shadow-[0_4px_0_#E64A19] overflow-hidden"
                      >
                        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-[#FFF5F0] to-transparent pointer-events-none" />
                        <span className="font-display font-black text-2xl text-[#FF5722] z-10 leading-none">
                          {digit}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Target Framed QR Code */}
                  <div className="relative p-2 rounded-xl bg-white border-2 border-[#EAE3D5] shadow-xs mb-1 group">
                    <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#FF5722] rounded-tl-sm pointer-events-none" />
                    <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#FF5722] rounded-tr-sm pointer-events-none" />
                    <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#FF5722] rounded-bl-sm pointer-events-none" />
                    <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#FF5722] rounded-br-sm pointer-events-none" />
                    <QRDisplay value={joinUrl} size={105} />
                  </div>
                  <p className="text-[10px] font-bold text-[#6B6280] text-center mb-1.5">
                    Escaneen con la cámara del celular
                  </p>

                  {/* Share buttons */}
                  <div className="w-full grid grid-cols-2 gap-2 mb-1.5">
                    <button
                      onClick={handleShareWhatsApp}
                      className="arcade-btn-mint py-1.5 px-2 rounded-xl font-tactical font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.961.897 2.796.897 3.182 0 5.769-2.587 5.769-5.766.001-3.181-2.586-5.766-5.769-5.766zm9.969 5.766c0 5.514-4.486 10-10 10-1.745 0-3.376-.452-4.801-1.241l-5.2 1.361 1.385-5.066c-.928-1.503-1.464-3.267-1.464-5.054 0-5.514 4.486-10 10-10 5.514 0 10 4.486 10 10z" />
                      </svg>
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={handleCopyLink}
                      className="arcade-btn py-1.5 px-2 rounded-xl font-tactical font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer text-[#181226] hover:text-[#FF5722]"
                    >
                      {copied ? (
                        <span className="text-[#059669] font-black">¡Copiado!</span>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* URL Display with Manual Override button */}
                  <div className="w-full bg-[#FAF7F2] px-2.5 py-1.5 rounded-xl border border-[#EAE3D5] flex items-center justify-between gap-2 text-left shadow-inner">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722] shrink-0" />
                      <span className="mono text-[11px] text-[#181226] font-bold truncate select-all">
                        {joinUrl}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsEditingUrl(!isEditingUrl)}
                      className="text-[10px] font-mono font-bold text-[#FF5722] hover:text-[#E11D48] px-1.5 py-0.5 rounded bg-white border border-[#EAE3D5] shrink-0 cursor-pointer shadow-2xs"
                    >
                      {isEditingUrl ? 'Cerrar' : 'IP'}
                    </button>
                  </div>

                  {/* Editor de IP / Host manual */}
                  {isEditingUrl && (
                    <div className="w-full mt-2 pt-2 border-t border-[#EAE3D5] flex gap-2">
                      <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="192.168.1.15:5173 o mitunel.ngrok.io"
                        className="flex-1 px-2.5 py-1 text-xs font-mono rounded-lg border border-[#EAE3D5] bg-white text-[#181226]"
                      />
                      <button
                        onClick={handleSaveCustomUrl}
                        className="arcade-btn-primary px-3 py-1 text-xs font-bold shrink-0"
                      >
                        OK
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center space-y-2">
                  <div className="w-8 h-8 border-3 border-[#FF5722] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold text-[#6B6280]">
                    Generando código y QR...
                  </p>
                  <button
                    onClick={handleManualRetryRoom}
                    className="arcade-btn px-3 py-1.5 text-xs font-bold text-[#FF5722]"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>

            {/* Lower Card: Playlist Console */}
            <div className="party-card p-3 sm:p-3.5 rounded-2xl flex-1 flex flex-col min-h-0 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#EAE3D5] shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-black uppercase tracking-wider text-[#181226] whitespace-nowrap">
                    Playlist
                  </span>
                  <span className="mono text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[#FF5722] border border-[#FF5722]/30 shrink-0">
                    {playlist.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {playlist.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClearPlaylistConfirm(true)}
                      className="h-7 px-2 rounded-lg text-[10px] font-bold text-[#E11D48] hover:bg-[#FFF0F3] border border-[#E11D48]/30 transition-all cursor-pointer inline-flex items-center gap-1"
                      title="Borrar todas las canciones"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Vaciar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsDjBotOpen(true)}
                    className="h-7 px-2.5 rounded-lg bg-gradient-to-tr from-[#FF5722] to-[#E11D48] text-white text-[11px] font-black shadow-2xs hover:brightness-105 active:scale-98 transition-all inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>DJ Bot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPlaylistDrawer(!showPlaylistDrawer)}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 border ${
                      showPlaylistDrawer
                        ? 'bg-[#FAF7F2] text-[#6B6280] border-[#EAE3D5]'
                        : 'bg-[#FFF0EB] text-[#FF5722] border-[#FF5722]/30 hover:bg-[#FFE5DC]'
                    }`}
                  >
                    <span>{showPlaylistDrawer ? 'Cerrar' : '+ Agregar'}</span>
                  </button>
                </div>
              </div>

              {/* Drawer Content or Tracks Roster */}
              {showPlaylistDrawer ? (
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {showPlaylistDrawer && (
                <div className="space-y-3 pt-2">
                  {/* Selector de modo: Buscar vs Archivos vs URLs */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF7F2] rounded-xl border border-[#EAE3D5]">
                    <button
                      type="button"
                      onClick={() => setPlaylistTab('search')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        playlistTab === 'search'
                          ? 'bg-[#FF5722] text-white shadow-xs'
                          : 'text-[#6B6280] hover:text-[#181226]'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="truncate">Buscar Canciones</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPlaylistTab('local')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        playlistTab === 'local'
                          ? 'bg-[#059669] text-white shadow-xs'
                          : 'text-[#6B6280] hover:text-[#181226]'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span className="truncate">Sin Internet (Local)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPlaylistTab('urls')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        playlistTab === 'urls'
                          ? 'bg-[#181226] text-white shadow-xs'
                          : 'text-[#6B6280] hover:text-[#181226]'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span className="truncate">Pegar Links</span>
                    </button>
                  </div>

                  {/* Tab 1: Buscador interactivo de canciones con sugerencias en tiempo real */}
                  {playlistTab === 'search' && (
                    <div className="space-y-3">
                      <form onSubmit={handleSearchSongs} className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Escribí una canción o artista (ej. De Música Ligera, Charly...)"
                            className="w-full bg-white border border-[#E0D9CB] rounded-xl pl-9 pr-9 py-2.5 text-xs sm:text-sm font-semibold text-[#181226] focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] outline-none shadow-inner"
                          />
                          <svg className="w-4 h-4 text-[#8E869E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>

                          {/* Loading indicator or clear button */}
                          {isSearching ? (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <svg className="w-4 h-4 text-[#FF5722] animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </div>
                          ) : searchQuery ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setSearchResults([]);
                                setSearchError('');
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E869E] hover:text-[#181226] p-0.5 rounded-full hover:bg-[#FAF7F2] cursor-pointer"
                              title="Limpiar búsqueda"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                        <button
                          type="submit"
                          disabled={!searchQuery.trim() || isSearching}
                          className="arcade-btn-primary px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {isSearching ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span>Buscando...</span>
                            </>
                          ) : (
                            <span>Buscar</span>
                          )}
                        </button>
                      </form>

                      {/* Header de sugerencias si hay resultados */}
                      {searchResults.length > 0 && (
                        <div className="flex items-center justify-between text-xs font-bold text-[#6B6280] px-1">
                          <span>Sugerencias en tiempo real ({searchResults.length})</span>
                          <span className="text-[10px] text-[#8E869E]">Hacé clic en + para sumar a la playlist</span>
                        </div>
                      )}

                      {searchError && (
                        <p className="text-xs text-[#E11D48] font-bold bg-[#FFF0F3] p-2.5 rounded-xl border border-[#E11D48]/30">
                          {searchError}
                        </p>
                      )}

                      {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && !searchError && (
                        <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-center">
                          <p className="text-xs font-bold text-[#181226]">No se encontraron canciones para "{searchQuery}"</p>
                          <p className="text-[11px] text-[#6B6280] mt-0.5">Probá con otro término, artista o pegá el link directo</p>
                        </div>
                      )}

                      {/* Lista de resultados encontrados */}
                      {searchResults.length > 0 && (
                        <div className="console-inset p-2.5 rounded-2xl max-h-64 overflow-y-auto space-y-2">
                          {searchResults.map((song) => {
                            const isAdded = playlist.some(
                              (p) => (typeof p === 'object' && p.id === song.id) || (typeof p === 'string' && p.includes(song.id))
                            );
                            const wasJustAdded = recentlyAddedId === song.id;

                            return (
                              <div
                                key={song.id}
                                className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white border border-[#EAE3D5] hover:border-[#FF5722]/50 transition-all shadow-2xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {song.thumbnail ? (
                                    <div className="relative w-12 h-9 rounded-lg overflow-hidden shrink-0 bg-black/10">
                                      <img
                                        src={song.thumbnail}
                                        alt={song.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                      {song.duration > 0 && (
                                        <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[9px] font-bold px-1 rounded">
                                          {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="w-10 h-9 rounded-lg bg-[#FFF0EB] flex items-center justify-center text-[#FF5722] shrink-0">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                      </svg>
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-xs text-[#181226] truncate leading-tight" title={song.title}>
                                      {song.title}
                                    </p>
                                    <p className="text-[11px] text-[#6B6280] truncate mt-0.5">
                                      {song.author || 'YouTube'}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleAddSearchResult(song)}
                                  disabled={wasJustAdded}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer ${
                                    wasJustAdded
                                      ? 'bg-[#E6F9F0] text-[#059669] border border-[#059669]/30'
                                      : isAdded
                                      ? 'bg-[#FAF7F2] text-[#6B6280] border border-[#EAE3D5] hover:bg-[#FFF0EB] hover:text-[#FF5722]'
                                      : 'arcade-btn-primary text-white shadow-xs'
                                  }`}
                                >
                                  {wasJustAdded ? '¡Agregada!' : isAdded ? '+ Agregar otra vez' : '+ Agregar'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Subir archivos de audio locales */}
                  {playlistTab === 'local' && (
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
                  )}

                  {/* Tab 3: Pegar URLs de YouTube / Spotify */}
                  {playlistTab === 'urls' && (
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
                </div>
              ) : playlist.length === 0 ? (
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-3 sm:p-4 bg-gradient-to-b from-[#FAF7F2] to-white rounded-xl border border-[#EAE3D5] shadow-inner my-auto">
                  {/* Stylized Vinyl Record Graphic */}
                  <div className="relative mb-2.5 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-[#181226] border-4 border-[#2E2445] shadow-md flex items-center justify-center relative overflow-hidden">
                      {/* Vinyl groove rings */}
                      <div className="absolute inset-1.5 rounded-full border border-white/10" />
                      <div className="absolute inset-3 rounded-full border border-white/10" />
                      {/* Center label */}
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#FF5722] to-[#E11D48] flex items-center justify-center shadow-inner">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                    </div>
                    {/* Tonearm needle */}
                    <div className="absolute -top-1 -right-1.5 w-6 h-1 bg-[#8E869E] rounded-full rotate-45 origin-left" />
                  </div>

                  <h4 className="font-display font-black text-sm text-[#181226] mb-0.5">
                    Tocadiscos en silencio
                  </h4>
                  <p className="text-[11px] text-[#6B6280] max-w-xs mb-3 leading-snug">
                    Generá una lista en 5 segundos con el DJ Bot o agregá canciones con el buscador.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                    <button
                      type="button"
                      onClick={() => setIsDjBotOpen(true)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#E11D48] text-white text-xs font-black shadow-sm hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Crear con DJ Bot</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPlaylistDrawer(true)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-white border border-[#DDD5C5] hover:border-[#FF5722] text-[#181226] text-xs font-bold shadow-2xs hover:bg-[#FAF7F2] transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>+ Buscar Canciones</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="mono text-[11px] font-black text-[#6B6280]">
                      PISTAS CARGADAS ({playlist.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowClearPlaylistConfirm(true)}
                        className="text-xs font-bold text-[#E11D48] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        Vaciar Lista
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !antiSpoiler;
                          setAntiSpoiler(next);
                          localStorage.setItem('trivia_anti_spoiler', next ? 'true' : 'false');
                        }}
                        className={`text-xs font-black px-2.5 py-1 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                          antiSpoiler
                            ? 'bg-[#FFF0EB] text-[#FF5722] border-[#FF5722]/40 shadow-xs'
                            : 'bg-[#FAF7F2] text-[#6B6280] border-[#EAE3D5] hover:text-[#181226]'
                        }`}
                        title={antiSpoiler ? 'Hacé clic para ver los títulos reales' : 'Ocultar títulos para evitar spoilers (no hacer trampa)'}
                      >
                        {antiSpoiler ? (
                          <>
                            <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                            <span>Modo Anti-Spoiler (Activo)</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Ocultar Títulos</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="console-inset p-3 rounded-2xl max-h-52 overflow-y-auto space-y-2">
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

                            <span
                              className={`truncate font-bold text-xs ${
                                antiSpoiler
                                  ? 'filter blur-[5px] select-none hover:blur-none transition-all duration-200 cursor-pointer text-[#8E869E]'
                                  : 'text-[#181226]'
                              }`}
                              title={antiSpoiler ? 'Pista protegida contra spoilers. Posá el cursor o hacé clic en el botón para ver.' : title}
                            >
                              {antiSpoiler ? `•••••••••••••••••••• (Pista #${idx + 1})` : title}
                              {!antiSpoiler && sizeTxt && <span className="mono text-[10px] text-[#6B6280] font-normal">{sizeTxt}</span>}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemovePlaylistItem(idx)}
                            className="text-[#8E869E] hover:text-[#E11D48] hover:bg-[#FFF0F3] p-1.5 rounded-lg shrink-0 cursor-pointer transition-colors"
                            title="Eliminar canción de la lista"
                            aria-label="Eliminar canción"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Jugadores, Carga Manual y Equipos (7 cols) */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-0">
            <div className="party-card p-3.5 sm:p-4 rounded-2xl flex-1 flex flex-col min-h-0 justify-between shadow-sm">
              {/* Top Configuration Strip */}
              <div className="pb-2 border-b border-[#EAE3D5] shrink-0 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* Mode contextual parameter */}
                  {gameMode === 'teams' && teamSelectionMode === 'auto' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#181226]">Cupo por equipo:</span>
                      <div className="inline-flex items-center bg-white border border-[#DDD5C5] rounded-xl shadow-2xs h-7 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleChangeTeamSize(Math.max(1, (maxPlayersPerTeam || 4) - 1))}
                          disabled={(maxPlayersPerTeam || 4) <= 1}
                          className="w-7 h-7 flex items-center justify-center text-xs font-black text-[#6B6280] hover:text-[#181226] hover:bg-[#FAF7F2] disabled:opacity-30 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-display font-black text-xs text-[#181226]">
                          {maxPlayersPerTeam || 4}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleChangeTeamSize(Math.min(50, (maxPlayersPerTeam || 4) + 1))}
                          disabled={(maxPlayersPerTeam || 4) >= 50}
                          className="w-7 h-7 flex items-center justify-center text-xs font-black text-[#6B6280] hover:text-[#181226] hover:bg-[#FAF7F2] disabled:opacity-30 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] uppercase font-bold text-[#8E869E] mr-0.5">Rápidos:</span>
                        {[2, 3, 4, 6, 8].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleChangeTeamSize(s)}
                            className={`w-6 h-6 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                              maxPlayersPerTeam === s
                                ? 'bg-[#FF5722] text-white font-black shadow-2xs'
                                : 'bg-white text-[#6B6280] border border-[#EAE3D5] hover:border-[#FF5722]'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {gameMode === 'teams' && teamSelectionMode === 'manual' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#181226]">Equipos:</span>
                      <div className="inline-flex items-center bg-white border border-[#DDD5C5] rounded-xl shadow-2xs h-7 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleInitManualTeams(Math.max(2, (teams?.length || 2) - 1))}
                          disabled={(teams?.length || 2) <= 2}
                          className="w-7 h-7 flex items-center justify-center text-xs font-black text-[#6B6280] hover:text-[#181226] hover:bg-[#FAF7F2] disabled:opacity-30 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-display font-black text-xs text-[#181226]">
                          {teams?.length || 2}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleInitManualTeams(Math.min(24, (teams?.length || 2) + 1))}
                          disabled={(teams?.length || 2) >= 24}
                          className="w-7 h-7 flex items-center justify-center text-xs font-black text-[#6B6280] hover:text-[#181226] hover:bg-[#FAF7F2] disabled:opacity-30 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddManualTeam}
                        className="px-2 py-1 rounded-lg text-[10px] font-black bg-white border border-[#DDD5C5] hover:border-[#FF5722] text-[#181226] cursor-pointer"
                      >
                        + 1 Equipo
                      </button>
                    </div>
                  )}

                  {gameMode === 'individual' && (
                    <span className="text-xs font-black text-[#D946EF]">
                      Modo Individual: Cada participante suma sus propios puntos con su propio pulsador.
                    </span>
                  )}

                  {/* Toggle button for manual player input */}
                  <button
                    type="button"
                    onClick={() => setShowManualInput(!showManualInput)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border ${
                      showManualInput
                        ? 'bg-[#FAF7F2] text-[#6B6280] border-[#EAE3D5]'
                        : 'bg-[#FFF0EB] text-[#FF5722] border-[#FF5722]/30 hover:bg-[#FFE5DC]'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span>{showManualInput ? 'Ocultar Carga' : '+ Invitado sin celular'}</span>
                  </button>
                </div>

                {/* Collapsible Manual Player Input */}
                {showManualInput && (
                  <form onSubmit={handleAddManualPlayer} className="flex gap-2 pt-1 animate-fade-in">
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Escribí el nombre del invitado..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#DDD5C5] rounded-xl focus:outline-none focus:border-[#FF5722] text-[#181226] shadow-2xs"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!manualName.trim()}
                      className="arcade-btn-primary px-3 py-1.5 font-black text-xs text-white shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      + Agregar
                    </button>
                  </form>
                )}
                {manualError && (
                  <p className="text-[11px] text-[#E11D48] font-bold bg-[#FFF0F3] p-1.5 rounded-lg border border-[#E11D48]/30">
                    {manualError}
                  </p>
                )}
              </div>

              {/* Center Arena / Stage */}
              <div className="flex-1 min-h-0 flex flex-col my-2">
                {!hasAssignedTeams ? (
                  players.length === 0 ? (
                    <div className="h-full flex-1 flex flex-col items-center justify-center text-center p-5 bg-gradient-to-b from-[#FAF7F2] to-white rounded-2xl border-2 border-dashed border-[#DDD5C5] shadow-inner my-auto">
                      <div className="relative mb-3.5 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-[#FF5722]/5 border border-[#FF5722]/20 flex items-center justify-center animate-ping pointer-events-none absolute" />
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#E11D48] text-white flex items-center justify-center shadow-lg relative">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#059669] border-2 border-white shadow-xs" />
                        </div>
                      </div>

                      <h3 className="font-display font-black text-base sm:text-lg text-[#181226] mb-1">
                        Esperando a los invitados...
                      </h3>
                      <p className="text-xs text-[#6B6280] max-w-sm mb-4 leading-relaxed">
                        Escaneen el código QR de la pantalla o ingresen al enlace desde su celular para entrar al juego.
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleSpawnBots}
                          disabled={isSpawningBots || !roomCode}
                          className="arcade-btn px-3 py-1.5 rounded-xl text-xs font-bold text-[#181226] hover:text-[#FF5722] flex items-center gap-1.5 cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>{isSpawningBots ? 'Conectando...' : 'Probar con Bots Demo'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowManualInput(true)}
                          className="arcade-btn px-3 py-1.5 rounded-xl text-xs font-bold text-[#6B6280] hover:text-[#181226] flex items-center gap-1 cursor-pointer"
                        >
                          <span>+ Cargar sin celular</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex-1 flex flex-col min-h-0 space-y-2.5">
                      <div className="flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-black text-xs sm:text-sm text-[#181226] tracking-tight">
                            Participantes Conectados
                          </span>
                          <span className="mono text-[11px] font-black px-2.5 py-0.5 rounded-full bg-[#181226] text-white">
                            {players.length}
                          </span>
                        </div>
                        <span className="text-xs text-[#059669] font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
                          En vivo (tiempo real)
                        </span>
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
                        {players.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FAF7F2] hover:bg-white border border-[#EAE3D5] shadow-2xs hover:shadow-xs transition-all animate-fade-in"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#FF5722] to-[#E11D48] text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                                {player.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="font-bold text-xs text-[#181226] truncate">{player.name}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {player.isManual ? (
                                <span className="text-[9px] uppercase font-black bg-[#FFF0EB] text-[#FF5722] border border-[#FF5722]/30 px-1.5 py-0.5 rounded">
                                  Manual
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-[#059669] bg-[#E6F9F0] px-1.5 py-0.5 rounded border border-[#059669]/30">
                                  Conectado
                                </span>
                              )}

                              {player.isManual && (
                                <button
                                  onClick={() => handleRemoveManualPlayer(player.id)}
                                  className="text-[#8E869E] hover:text-[#E11D48] p-1 cursor-pointer"
                                  title="Eliminar jugador manual"
                                  aria-label="Eliminar jugador"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {teamSelectionMode === 'manual' && teams && teams.length > 0 && (
                        <div className="p-2.5 bg-[#FAF7F2] border border-[#EAE3D5] rounded-xl shadow-2xs shrink-0">
                          <p className="text-[11px] font-bold text-[#6B6280] mb-1">
                            Equipos disponibles para elegir desde el celular ({teams.length}):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {teams.map((t, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 border shadow-2xs bg-white"
                                style={{
                                  backgroundColor: `${t.color}15`,
                                  borderColor: `${t.color}40`,
                                  color: t.color,
                                }}
                              >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                                {t.name} (0)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                    {/* Newly arrived players waiting for team assignment */}
                    {unassignedPlayers.length > 0 && (
                      <div className="p-3 bg-[#FFF8F5] border-2 border-[#FF5722]/30 rounded-2xl shadow-xs animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-pulse" />
                            <p className="text-xs font-black text-[#181226]">
                              Recién conectados sin equipo ({unassignedPlayers.length}):
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleShuffle}
                            className="text-[11px] font-black text-[#FF5722] hover:underline cursor-pointer"
                          >
                            Sortear para incluir
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {unassignedPlayers.map((p) => (
                            <span
                              key={p.id}
                              className="text-xs px-2.5 py-1 rounded-xl bg-white border border-[#FF5722]/30 text-[#181226] font-bold shadow-2xs flex items-center gap-1"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722]" />
                              {p.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="badge-tag text-[#6B6280]">
                        {gameMode === 'individual'
                          ? `Jugadores individuales (${teams.length})`
                          : teamSelectionMode === 'manual'
                          ? `Equipos habilitados (${teams.length}) · ${maxPlayersPerTeam > 0 ? `Máx. ${maxPlayersPerTeam} c/u` : 'Sin límite de cupo'}`
                          : `Equipos asignados (balanceados, máx. ${maxPlayersPerTeam} c/u)`}
                      </p>
                      <span className="text-xs text-[#6B6280]">
                        {gameMode === 'individual'
                          ? 'Cada jugador tiene su propio equipo'
                          : teamSelectionMode === 'manual'
                          ? 'Los jugadores eligen equipo desde su teléfono'
                          : 'Podés reasignar jugadores usando el selector'}
                      </span>
                    </div>

                    <TeamDisplay
                      teams={teams}
                      onMovePlayer={handleMovePlayer}
                      onRenameTeam={handleRenameTeam}
                      onRemoveTeam={teamSelectionMode === 'manual' ? handleRemoveManualTeam : undefined}
                      maxPlayersPerTeam={maxPlayersPerTeam}
                    />
                  </div>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="pt-2.5 border-t border-[#EAE3D5] shrink-0 w-full">
                {!hasAssignedTeams ? (
                  players.length < (gameMode === 'individual' ? 1 : 2) ? (
                    <div className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] shadow-inner gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#FFF0EB] border border-[#FF5722]/30 flex items-center justify-center text-[#FF5722] font-black text-xs shrink-0">
                          {players.length}/{gameMode === 'individual' ? '1' : '2'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#181226] truncate">
                            {gameMode === 'individual'
                              ? 'Se necesita al menos 1 participante'
                              : 'Se necesitan al menos 2 participantes para sortear equipos'}
                          </p>
                          <p className="text-[10px] text-[#6B6280] truncate">
                            Escaneen el QR desde el celular o sumá bots para probar.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSpawnBots}
                        disabled={isSpawningBots || !roomCode}
                        className="arcade-btn px-3 py-1.5 rounded-xl text-xs font-bold text-[#FF5722] shrink-0 cursor-pointer"
                      >
                        {isSpawningBots ? 'Conectando...' : '+ Conectar Bots'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleShuffle}
                      disabled={isShuffling}
                      className="arcade-btn-primary w-full py-3.5 rounded-2xl text-sm sm:text-base font-display font-black text-white flex items-center justify-center gap-2.5 shadow-lg cursor-pointer transition-all hover:brightness-105 active:scale-98"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>
                        {isShuffling
                          ? 'Configurando...'
                          : gameMode === 'individual'
                          ? 'Armar Partida Individual →'
                          : `Sortear Equipos y Armar la Partida (Máx. ${maxPlayersPerTeam} por equipo) →`}
                      </span>
                    </button>
                  )
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                    <button
                      onClick={handleShuffle}
                      className="arcade-btn py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shrink-0 text-[#181226] hover:text-[#FF5722]"
                    >
                      <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>{gameMode === 'individual' ? 'Reordenar jugadores' : 'Volver a sortear'}</span>
                    </button>

                    {teams && teams.length > 0 && teams.every((t) => t.isReady) ? (
                      <button
                        onClick={handleStartGame}
                        className="arcade-btn-primary flex-1 py-3.5 rounded-xl text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                      >
                        <span>Iniciar Partida →</span>
                      </button>
                    ) : (
                      <div className="flex-1 py-2 px-3 rounded-xl bg-[#FFFBEB] border border-[#F59E0B]/50 flex items-center justify-between gap-2 text-[#B45309]">
                        <div className="flex items-center gap-2 min-w-0">
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DJ Bot Modal */}
      <DjBotModal
        isOpen={isDjBotOpen}
        onClose={() => setIsDjBotOpen(false)}
        onPlaylistGenerated={handleDjBotGenerated}
        existingPlaylist={playlist}
        serverUrl={SERVER_URL}
      />

      {/* Playlist Loading Modal for URL / list imports */}
      <PlaylistLoadingModal
        isOpen={isLoadingPlaylist}
        tag="PROCESANDO PLAYLIST"
        title="Cargando Canciones"
        subtitle="Buscando las pistas en YouTube y organizando la lista sin spoilers."
      />

      {/* Modal de confirmación para Vaciar Playlist */}
      {showClearPlaylistConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E0A16]/80 animate-fade-in select-none"
          onClick={() => setShowClearPlaylistConfirm(false)}
        >
          <div
            className="party-card p-6 sm:p-8 max-w-md w-full rounded-[2rem] bg-white border-2 border-[#EAE3D5] text-center shadow-2xl animate-fade-in text-[#181226]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] border-2 border-[#E11D48]/30 flex items-center justify-center mx-auto mb-4 text-[#E11D48] shadow-xs">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <p className="badge-tag text-[#E11D48] mb-1">VACIAR PLAYLIST</p>
            <h3 className="font-display text-xl sm:text-2xl font-black text-[#181226] tracking-tight mb-2">
              ¿Eliminar todas las canciones?
            </h3>
            <p className="text-xs sm:text-sm text-[#6B6280] font-medium leading-relaxed mb-6">
              Se quitarán las {playlist.length} canciones cargadas actualmente para que puedas armar una lista nueva desde cero.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearPlaylistConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-[#EAE3D5] text-xs sm:text-sm font-bold text-[#6B6280] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClearPlaylist();
                  setShowClearPlaylistConfirm(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs sm:text-sm font-black transition-all cursor-pointer shadow-xs"
              >
                Sí, borrar todas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
