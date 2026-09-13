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

  // ── Interactive Song Search ──────────────────────────────────
  const handleSearchSongs = async (e) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q || q.length < 2) return;
    setIsSearching(true);
    setSearchError('');
    try {
      const serverEndpoint = SERVER_URL || socket.io?.uri || window.location.origin;
      const res = await fetch(`${serverEndpoint}/api/search-songs?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setSearchResults(data.results);
      } else {
        setSearchError(data.error || 'No se encontraron resultados');
      }
    } catch (err) {
      setSearchError('Error de red al conectar con el servidor para buscar canciones');
    } finally {
      setIsSearching(false);
    }
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
      <div className="min-h-dvh p-3.5 sm:p-6 md:p-8 flex flex-col items-center justify-center relative overflow-hidden text-[var(--color-text-primary)]">
        {/* Dynamic ambient color glow matching the current preview/mode */}
        <div
          className="absolute -top-12 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: currentTheme.color }}
        />
        <div
          className="absolute -bottom-12 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: currentTheme.color }}
        />

        <div className="w-full max-w-6xl relative z-10">
          <div className="mb-4">
            <button
              onClick={() => navigate('/')}
              className="arcade-btn px-4 py-2 rounded-xl text-xs font-black text-[#181226] hover:text-[#FF5722] flex items-center gap-2 cursor-pointer shadow-xs active:translate-y-0.5 transition-all"
            >
              <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver al Inicio</span>
            </button>
          </div>

          <GameModeSelector
            roomCode={roomCode}
            initialParams={{ gameMode, teamSelectionMode, autoHostEnabled, maxPlayersPerTeam }}
            onConfirm={handleConfirmGameModeFromSelector}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-3.5 sm:p-6 md:p-8 text-[var(--color-text-primary)] relative overflow-hidden">
      {/* Ambient background glow tailored to the active mode color */}
      <div
        className="absolute top-[-10%] left-[20%] w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-15 transition-all duration-700"
        style={{ backgroundColor: currentTheme.color }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
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

              {/* Mode Badge with distinct color */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black border shadow-2xs transition-all"
                style={{
                  backgroundColor: currentTheme.colorLight,
                  borderColor: currentTheme.colorBorder,
                  color: currentTheme.colorText,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.color }} />
                <span>Modo: {currentTheme.name}</span>
              </div>

              {/* Button to reopen Mode Selection Menu */}
              <button
                type="button"
                onClick={() => setIsModeConfirmed(false)}
                className="arcade-btn px-3 py-1.5 rounded-full text-xs font-bold text-[#6B6280] hover:text-[#181226] flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-[#FF5722]/50 transition-colors"
                title="Cambiar la modalidad de juego"
              >
                <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Cambiar Modo</span>
              </button>
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

                <div className="flex items-center gap-2">
                  {playlist.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClearPlaylistConfirm(true)}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold text-[#E11D48] hover:bg-[#FFF0F3] border border-[#E11D48]/30 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Borrar todas las canciones cargadas"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Borrar Todas</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsDjBotOpen(true)}
                    className="px-3 py-1 rounded-xl bg-gradient-to-tr from-[#FF5722] to-[#E11D48] text-white text-xs font-black shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                    title="Generar playlist automática por género y época"
                  >
                    <span>DJ Bot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPlaylistDrawer(!showPlaylistDrawer)}
                    className="text-xs font-bold text-[#FF5722] hover:underline cursor-pointer"
                  >
                    {showPlaylistDrawer ? 'Cerrar' : '+ Agregar'}
                  </button>
                </div>
              </div>

              <p className="text-xs text-[#6B6280] mb-3">
                Cargá archivos descargados (.mp3, .wav) para jugar 100% offline sin datos, o pegá enlaces web de YouTube.
              </p>

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

                  {/* Tab 1: Buscador interactivo de canciones con YouTube */}
                  {playlistTab === 'search' && (
                    <div className="space-y-3">
                      <form onSubmit={handleSearchSongs} className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscá por canción o artista (ej. Crimen, Shake It Off...)"
                            className="w-full bg-white border border-[#E0D9CB] rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm font-semibold text-[#181226] focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] outline-none shadow-inner"
                          />
                          <svg className="w-4 h-4 text-[#8E869E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
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

                      {searchError && (
                        <p className="text-xs text-[#E11D48] font-bold bg-[#FFF0F3] p-2.5 rounded-xl border border-[#E11D48]/30">
                          {searchError}
                        </p>
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
              {playlist.length > 0 && (
                <div className="mt-4">
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
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Jugadores, Carga Manual y Equipos (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="party-card p-6 sm:p-8 rounded-[2rem]"
            >
              {/* Header: Connected count & Mode selector */}
              <div className="space-y-4 mb-6 pb-4 border-b border-[#EAE3D5]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-xl font-black text-[#181226]">
                      Modalidad de Juego y Equipos
                    </h2>
                    <p className="text-xs text-[#6B6280] mt-0.5">
                      {players.length} participante{players.length === 1 ? '' : 's'} · <span className="font-bold text-[#181226]">{currentTheme.name}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    {/* Botón para ver explicación detallada de modos */}
                    <button
                      type="button"
                      onClick={() => setIsModeConfirmed(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#6B6280] bg-white border border-[#EAE3D5] hover:border-[#FF5722]/50 hover:text-[#181226] transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                      title="Ver guía completa y cambiar modo"
                    >
                      <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Ver Explicación / Cambiar</span>
                    </button>

                    {/* Switcher Auto-Host (Todos Juegan) */}
                    <button
                      type="button"
                      onClick={handleToggleAutoHost}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
                        autoHostEnabled
                          ? 'bg-[#059669] text-white border-[#059669]/60 shadow-xs scale-102'
                          : 'bg-[#FAF7F2] text-[#6B6280] border-[#EAE3D5] hover:text-[#181226]'
                      }`}
                    >
                      <span>{autoHostEnabled ? 'Modo Todos Juegan: ACTIVO' : 'Con Host Dedicado'}</span>
                    </button>
                  </div>
                </div>

                {/* Switcher Formación: Sorteo (Índigo) vs Elección Manual (Naranja) vs Individual (Fucsia) */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF7F2] rounded-2xl border border-[#EAE3D5]">
                  <button
                    type="button"
                    onClick={() => {
                      handleSwitchGameMode('teams');
                      handleSwitchTeamSelectionMode('auto');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                      gameMode === 'teams' && teamSelectionMode === 'auto'
                        ? 'bg-[#4F46E5] text-white shadow-xs'
                        : 'text-[#6B6280] hover:text-[#181226]'
                    }`}
                  >
                    <span>Sorteo Automático</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSwitchGameMode('teams');
                      handleSwitchTeamSelectionMode('manual');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                      gameMode === 'teams' && teamSelectionMode === 'manual'
                        ? 'bg-[#FF5722] text-white shadow-xs'
                        : 'text-[#6B6280] hover:text-[#181226]'
                    }`}
                  >
                    <span>Elección Manual</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSwitchGameMode('individual');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                      gameMode === 'individual'
                        ? 'bg-[#D946EF] text-white shadow-xs'
                        : 'text-[#6B6280] hover:text-[#181226]'
                    }`}
                  >
                    <span>Individual</span>
                  </button>
                </div>
              </div>

              {/* Banner Informativo / Configuración contextual según el modo elegido */}
              {autoHostEnabled && (
                <div className="p-3 bg-[#E6F9F0] border border-[#059669]/30 rounded-2xl mb-5 flex items-center gap-2.5 text-[#065F46]">
                  <span className="w-8 h-8 rounded-xl bg-[#059669] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </span>
                  <p className="text-xs font-bold leading-tight">
                    <strong>Modo Todos Juegan:</strong> La pantalla conduce automáticamente la ronda y revela la canción al cabo de 5 segundos. ¡El anfitrión también puede unirse a jugar desde su teléfono!
                  </p>
                </div>
              )}

              {gameMode === 'teams' && teamSelectionMode === 'manual' && (
                <div className="p-4 bg-[#FAF7F2] border border-[#EAE3D5] rounded-2xl mb-5 space-y-3.5">
                  {/* Fila 1: Cantidad de Equipos */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#EAE3D5]/80">
                    <div>
                      <p className="text-xs font-black text-[#181226]">
                        Cantidad de Equipos:{' '}
                        <span className="text-[#FF5722]">{teams?.length || 2} equipos</span>
                      </p>
                      <p className="text-[11px] text-[#6B6280]">
                        Elegí cuántos grupos crear para que los participantes se unan libremente:
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Stepper + Input */}
                      <div className="flex items-center bg-white border border-[#EAE3D5] rounded-xl p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleInitManualTeams(Math.max(2, (teams?.length || 2) - 1))}
                          disabled={(teams?.length || 2) <= 2}
                          className="w-7 h-7 rounded-lg text-xs font-black text-[#6B6280] hover:text-[#181226] hover:bg-[#FAF7F2] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors"
                          title="Menos equipos"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="2"
                          max="24"
                          value={teams?.length || 2}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 2 && val <= 24) handleInitManualTeams(val);
                          }}
                          className="w-10 text-center font-black text-xs text-[#181226] border-none focus:outline-none bg-transparent p-0"
                          title="Escribí la cantidad exacta de equipos"
                        />
                        <button
                          type="button"
                          onClick={() => handleInitManualTeams(Math.min(24, (teams?.length || 2) + 1))}
                          disabled={(teams?.length || 2) >= 24}
                          className="w-7 h-7 rounded-lg text-xs font-black text-[#6B6280] hover:text-[#181226] hover:bg-[#FAF7F2] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors"
                          title="Más equipos"
                        >
                          +
                        </button>
                      </div>

                      {/* Botón rápido + 1 equipo */}
                      <button
                        type="button"
                        onClick={() => handleAddManualTeam()}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-black bg-white border border-[#EAE3D5] hover:border-[#FF5722] hover:text-[#FF5722] text-[#181226] cursor-pointer shadow-2xs shrink-0 transition-colors"
                        title="Sumar un equipo más al listado"
                      >
                        + 1 Equipo
                      </button>
                    </div>
                  </div>

                  {/* Chips rápidos de cantidad de equipos */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-[#8E869E] mr-1">Equipos:</span>
                    {[2, 3, 4, 5, 6, 8, 10, 12, 16].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => handleInitManualTeams(count)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                          (teams?.length || 2) === count
                            ? 'bg-[#FF5722] text-white shadow-2xs font-black'
                            : 'bg-white border border-[#EAE3D5] text-[#6B6280] hover:border-[#FF5722]/50 hover:text-[#181226]'
                        }`}
                      >
                        {count} eq.
                      </button>
                    ))}
                  </div>

                  {/* Fila 2: Límite de Jugadores por Equipo */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#EAE3D5]/80">
                    <div>
                      <p className="text-xs font-black text-[#181226]">
                        Cupo por Equipo:{' '}
                        <span className="text-[#FF5722]">
                          {maxPlayersPerTeam === 0 ? 'Sin límite (Libre)' : `${maxPlayersPerTeam} personas`}
                        </span>
                      </p>
                      <p className="text-[11px] text-[#6B6280]">
                        {maxPlayersPerTeam === 0
                          ? 'Cualquier cantidad de jugadores puede unirse al mismo equipo.'
                          : `Si un equipo llega a ${maxPlayersPerTeam} integrantes, se bloquea el ingreso en los teléfonos.`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      <button
                        type="button"
                        onClick={() => handleChangeTeamSize(0)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          maxPlayersPerTeam === 0
                            ? 'bg-[#059669] text-white shadow-2xs'
                            : 'bg-white text-[#6B6280] border border-[#EAE3D5] hover:border-[#059669]/50 hover:text-[#181226]'
                        }`}
                        title="Sin límite de participantes por equipo"
                      >
                        Sin límite
                      </button>
                      {[2, 3, 4, 5, 6, 8, 10].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleChangeTeamSize(size)}
                          className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            maxPlayersPerTeam === size
                              ? 'bg-[#FF5722] text-white shadow-2xs'
                              : 'bg-white text-[#6B6280] border border-[#EAE3D5] hover:border-[#FF5722]/50 hover:text-[#181226]'
                          }`}
                          title={`${size} jugadores por equipo`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {gameMode === 'teams' && teamSelectionMode === 'auto' && (
                <div className="p-4 bg-[#FAF7F2] border border-[#EAE3D5] rounded-2xl mb-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#181226]">
                        Integrantes por equipo:{' '}
                        <span className="text-[#FF5722]">{maxPlayersPerTeam} personas</span>
                      </p>
                      <p className="text-[11px] text-[#6B6280]">
                        {players.length > 0
                          ? `Para ${players.length} participante${players.length === 1 ? '' : 's'}, se formarán aprox. ${Math.max(players.length > 1 ? 2 : 1, Math.ceil(players.length / (maxPlayersPerTeam || 1)))} equipos.`
                          : `Los participantes se balancearán automáticamente (máx. ${maxPlayersPerTeam} por equipo).`}
                      </p>
                    </div>

                    {/* Stepper + Custom Number Input */}
                    <div className="flex items-center bg-white border border-[#EAE3D5] rounded-xl p-0.5 shadow-2xs shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleChangeTeamSize(Math.max(1, (maxPlayersPerTeam || 4) - 1))}
                        disabled={(maxPlayersPerTeam || 4) <= 1}
                        className="w-8 h-8 rounded-lg text-xs font-black text-[#6B6280] hover:text-[#181226] hover:bg-[#FAF7F2] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors"
                        title="Menos jugadores por equipo"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={maxPlayersPerTeam || 4}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1 && val <= 50) handleChangeTeamSize(val);
                        }}
                        className="w-12 text-center font-black text-xs text-[#181226] border-none focus:outline-none bg-transparent p-0"
                        title="Escribí cualquier cantidad de integrantes por equipo"
                      />
                      <button
                        type="button"
                        onClick={() => handleChangeTeamSize(Math.min(50, (maxPlayersPerTeam || 4) + 1))}
                        disabled={(maxPlayersPerTeam || 4) >= 50}
                        className="w-8 h-8 rounded-lg text-xs font-black text-[#6B6280] hover:text-[#181226] hover:bg-[#FAF7F2] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors"
                        title="Más jugadores por equipo"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Quick Chips Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#EAE3D5]/80">
                    <span className="text-[10px] uppercase font-bold text-[#8E869E] mr-1">Rápidos:</span>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleChangeTeamSize(size)}
                        className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          maxPlayersPerTeam === size
                            ? 'bg-[#FF5722] text-white shadow-2xs'
                            : 'bg-white text-[#6B6280] border border-[#EAE3D5] hover:border-[#FF5722]/50 hover:text-[#181226]'
                        }`}
                        title={`${size} jugadores por equipo`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {gameMode === 'individual' && (
                <div className="p-3 bg-[#FFF0EB]/70 border border-[#FF5722]/20 rounded-2xl mb-5 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-[#FF5722] text-white flex items-center justify-center text-xs shrink-0 shadow-xs">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-[#181226]">
                    Modo Individual: Todos contra todos. Cada jugador suma sus propios puntos con su propio pulsador buzzer.
                  </p>
                </div>
              )}

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
              {!hasAssignedTeams ? (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <p className="badge-tag text-[#6B6280]">
                      Participantes conectados ({players.length})
                    </p>
                    <span className="text-xs text-[#059669] font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
                      En vivo (tiempo real)
                    </span>
                  </div>

                  <div className="console-inset p-3.5 rounded-2xl min-h-[180px] max-h-72 overflow-y-auto space-y-2">
                    {players.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-sm font-semibold text-[#181226] mb-1">
                          Aún no hay jugadores conectados
                        </p>
                        <p className="text-xs text-[#6B6280]">
                          Escaneen el código QR o abran el enlace desde el celular para ingresar.
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
                            {player.isManual ? (
                              <span className="text-[10px] uppercase font-black bg-[#FFF0EB] text-[#FF5722] border border-[#FF5722]/30 px-2 py-0.5 rounded-md">
                                Manual
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-[#059669] bg-[#E6F9F0] px-2 py-0.5 rounded-md border border-[#059669]/30">
                                Conectado
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

                  {teamSelectionMode === 'manual' && teams && teams.length > 0 && (
                    <div className="p-3 bg-white border border-[#EAE3D5] rounded-2xl shadow-2xs">
                      <p className="text-[11px] font-bold text-[#6B6280] mb-1.5">
                        Equipos disponibles para elegir desde el celular ({teams.length}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {teams.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 border shadow-2xs"
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
              ) : (
                <div className="mb-6 space-y-4">
                  {/* Newly arrived players waiting for team assignment */}
                  {unassignedPlayers.length > 0 && (
                    <div className="p-3.5 bg-[#FFF8F5] border-2 border-[#FF5722]/30 rounded-2xl shadow-xs animate-fade-in">
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

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {!hasAssignedTeams ? (
                  <button
                    onClick={handleShuffle}
                    disabled={players.length < (gameMode === 'individual' ? 1 : 2) || isShuffling}
                    className="arcade-btn-primary flex-1 py-4 rounded-2xl text-base font-black disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>
                      {isShuffling
                        ? 'Configurando...'
                        : gameMode === 'individual'
                        ? 'Armar Partida Individual'
                        : `Sortear Equipos (Máx. ${maxPlayersPerTeam} por equipo)`}
                    </span>
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
                      <span>{gameMode === 'individual' ? 'Reordenar jugadores' : 'Volver a sortear'}</span>
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
      {/* DJ Bot Modal */}
      <DjBotModal
        isOpen={isDjBotOpen}
        onClose={() => setIsDjBotOpen(false)}
        onPlaylistGenerated={handleDjBotGenerated}
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
