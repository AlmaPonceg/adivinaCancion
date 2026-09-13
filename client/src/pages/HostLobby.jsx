import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import socket, { SERVER_URL } from '../socket';
import { useSocketEvent, useSocketEmit } from '../hooks/useSocket';
import QRDisplay from '../components/QRDisplay';
import TeamDisplay from '../components/TeamDisplay';
import LobbyAudio from '../components/LobbyAudio';
import PlaylistSetup from '../components/PlaylistSetup';
import GameModeSelector, { GAME_MODES } from '../components/GameModeSelector';
import SpotlightTutorial from '../components/SpotlightTutorial';
import { lobbyAudioManager } from '../utils/lobbyAudio';
import { hydratePlaylistTracks } from '../utils/audioStorage';

const LOBBY_TUTORIAL_STEPS = [
  {
    targetId: 'tour-room-access',
    title: '1. Código y QR de la Sala',
    description: 'Tus invitados se unen escaneando este código QR con la cámara de su teléfono o ingresando el código de 4 letras desde la pantalla inicial.',
    placement: 'right',
  },
  {
    targetId: 'tour-share-links',
    title: '2. Compartir la Sala',
    description: '¿Hay amigos jugando a la distancia? Tocá "WhatsApp" para mandarles la invitación directa o "Copiar Link" para enviarlo por cualquier chat.',
    placement: 'right',
  },
  {
    targetId: 'tour-mode-badge',
    title: '3. Modalidad de Juego',
    description: 'Elegí cómo compiten: en equipos automáticos balanceados, equipos elegidos por los participantes, modo individual de todos contra todos, o Auto-Host para que vos también juegues sin ver las soluciones.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-playlist-strip',
    title: '4. Playlist de Canciones',
    description: 'Acá ves la cantidad de canciones cargadas. Podés tocar "Editar Playlist" en cualquier momento para agregar más canciones de YouTube, subir audios locales o elegir listas guardadas.',
    placement: 'right',
  },
  {
    targetId: 'tour-players-section',
    title: '5. Participantes e Invitados',
    description: 'A medida que tus amigos entren, van a aparecer acá en tiempo real. Si alguien no tiene celular o se quedó sin batería, tocas "+ Invitado sin celular" para sumarlo a mano.',
    placement: 'left',
  },
  {
    targetId: 'tour-action-bar',
    title: '6. ¡Sortear e Iniciar la Fiesta!',
    description: 'Cuando estén todos los participantes conectados, presioná este botón para sortear los equipos balanceados. Luego tocas "Iniciar Partida" ¡y empieza la música!',
    placement: 'top',
  },
];

export default function HostLobby() {
  const navigate = useNavigate();
  const emit = useSocketEmit();
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(socket.connected ? 'connected' : 'connecting');

  // ── Step State: 'mode' | 'playlist' | 'lobby' ───────────────
  const [setupStep, setSetupStep] = useState('mode');
  const [showTutorial, setShowTutorial] = useState(false);

  // Auto-launch tutorial on first visit to the lobby
  useEffect(() => {
    if (setupStep === 'lobby') {
      try {
        const seen = localStorage.getItem('trivia_host_tutorial_seen');
        if (!seen) {
          const timer = setTimeout(() => setShowTutorial(true), 500);
          return () => clearTimeout(timer);
        }
      } catch {
        // Safe fallback if localStorage is blocked
      }
    }
  }, [setupStep]);

  // ── Playlist State ──────────────────────────────────────────
  const [playlist, setPlaylist] = useState(() => {
    try {
      const saved = localStorage.getItem('trivia_playlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [antiSpoiler, setAntiSpoiler] = useState(() => {
    return localStorage.getItem('trivia_anti_spoiler') === 'true';
  });

  // ── Mode & Team Sizing ──────────────────────────────────────
  const [gameMode, setGameMode] = useState('teams'); // 'teams' | 'individual'
  const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState(4);
  const [teamSelectionMode, setTeamSelectionMode] = useState('auto'); // 'auto' | 'manual'
  const [autoHostEnabled, setAutoHostEnabled] = useState(false);

  const currentTheme = useMemo(() => {
    if (autoHostEnabled) return GAME_MODES.find((m) => m.id === 'autohost') || GAME_MODES[0];
    if (gameMode === 'individual') return GAME_MODES.find((m) => m.id === 'individual') || GAME_MODES[2];
    if (teamSelectionMode === 'manual') return GAME_MODES.find((m) => m.id === 'manual') || GAME_MODES[1];
    return GAME_MODES.find((m) => m.id === 'auto') || GAME_MODES[0];
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
    // Advance to step 2 (Playlist Setup)
    setSetupStep('playlist');
  };

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

  // ── Mode Switch & Team Size Handlers ────────────────────────
  const handleInitManualTeams = (count) => {
    const val = typeof count === 'number' ? count : parseInt(count, 10);
    const sanitized = isNaN(val) ? 2 : Math.max(2, Math.min(24, val));
    socket.emit('init-manual-teams', { roomCode, count: sanitized }, (res) => {
      if (res?.teams) setTeams(res.teams);
    });
  };

  const handleAddManualTeam = () => {
    socket.emit('add-manual-team', { roomCode, teamName: `Equipo ${(teams?.length || 0) + 1}` }, (res) => {
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

  // ── Shuffle Teams ───────────────────────────────────────────
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

  // ── Playlist Storage Helper ─────────────────────────────────
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
          thumbnail: t.thumbnail,
          duration: t.duration,
        };
      }
      return t;
    });
    localStorage.setItem('trivia_playlist', JSON.stringify(persistable));
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

  // ── STEP 1: Game Mode Selector ──────────────────────────────
  if (setupStep === 'mode') {
    return (
      <div className="h-screen max-h-screen p-3 sm:p-4 md:p-6 flex items-center justify-center relative overflow-hidden text-[var(--color-text-primary)]">
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

  // ── STEP 2: Dedicated Playlist Setup View ───────────────────
  if (setupStep === 'playlist') {
    return (
      <PlaylistSetup
        playlist={playlist}
        setPlaylist={setPlaylist}
        savePlaylistToStorage={savePlaylistToStorage}
        antiSpoiler={antiSpoiler}
        setAntiSpoiler={setAntiSpoiler}
        currentTheme={currentTheme}
        roomCode={roomCode}
        onBack={() => setSetupStep('mode')}
        onContinue={() => setSetupStep('lobby')}
      />
    );
  }

  // ── STEP 3: Clean Host Lobby View ───────────────────────────
  return (
    <div className="h-screen max-h-screen p-3 sm:p-4 flex flex-col text-[var(--color-text-primary)] relative overflow-hidden">
      {/* Ambient background glow tailored to active mode color */}
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
              Lobby de Espera
            </h1>

            <div className="px-2.5 py-1 rounded-xl bg-white border border-[#DDD5C5] font-mono text-xs font-black text-[#181226] shadow-2xs flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${roomCode ? 'bg-[#059669]' : 'bg-[#D97706]'}`} />
              <span>{roomCode ? `SALA ${roomCode}` : 'CONECTANDO...'}</span>
            </div>

            {/* Quick Button to Change Mode */}
            <button
              id="tour-mode-badge"
              type="button"
              onClick={() => setSetupStep('mode')}
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
              <span className="text-[10px] underline ml-0.5 font-black">Cambiar</span>
            </button>

            {/* Quick Button to Change / View Playlist */}
            <button
              type="button"
              onClick={() => setSetupStep('playlist')}
              className="px-2.5 py-1 rounded-xl text-xs font-bold border border-[#FF5722]/30 bg-[#FFF0EB] text-[#FF5722] hover:bg-[#FFE5DC] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Ver o cambiar la playlist de canciones"
            >
              <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span>Playlist: {playlist.length} {playlist.length === 1 ? 'canción' : 'canciones'}</span>
              <span className="text-[10px] underline ml-0.5 font-black">Editar</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              className="arcade-btn px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#6B6280] hover:text-[#FF5722] flex items-center gap-1.5 cursor-pointer"
              title="Ver tutorial guiado de la pantalla"
            >
              <span className="w-4 h-4 rounded-full bg-[#FF5722] text-white flex items-center justify-center text-[10px] font-black leading-none">?</span>
              <span>Tutorial</span>
            </button>
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

        {/* ── Main 2-Column Console Layout (Clean & Zero Scroll) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 items-stretch overflow-hidden">
          {/* LEFT COLUMN: Room Access & QR Code (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-center items-center h-full min-h-0">
            <div className="party-card p-5 sm:p-6 rounded-3xl flex flex-col items-center w-full max-w-[435px] shadow-md my-auto space-y-3.5">
              {roomCode ? (
                <>
                  {/* TOP: VIP Access Ribbon & 3D Digit Tiles */}
                  <div className="w-full flex flex-col items-center shrink-0">
                    <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-[#181226] mb-3 shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
                        <span className="font-tactical font-black text-[11px] tracking-widest uppercase text-[#6B6280]">
                          Acceso de Invitados
                        </span>
                      </div>
                      <span className="font-mono text-xs text-[#FF5722] font-black">
                        SALA {roomCode}
                      </span>
                    </div>

                    {/* 3D Physical Arcade Digit Tiles */}
                    <div className="flex gap-2.5 sm:gap-3 justify-center">
                      {roomCode.split('').map((digit, i) => (
                        <div
                          key={i}
                          className="relative flex flex-col items-center justify-center w-14 h-16 sm:w-16 sm:h-18 bg-white rounded-2xl border-2 border-[#FF5722] shadow-[0_5px_0_#E64A19] overflow-hidden"
                        >
                          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-[#FFF5F0] to-transparent pointer-events-none" />
                          <span className="font-display font-black text-3xl sm:text-4xl text-[#FF5722] z-10 leading-none">
                            {digit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CENTER HERO: Prominent Framed QR Code & Helper Text */}
                  <div id="tour-room-access" className="w-full flex flex-col items-center justify-center">
                    <div className="relative p-4 rounded-2xl bg-white border-2 border-[#EAE3D5] shadow-xs group">
                      <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#FF5722] rounded-tl-sm pointer-events-none" />
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#FF5722] rounded-tr-sm pointer-events-none" />
                      <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#FF5722] rounded-bl-sm pointer-events-none" />
                      <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#FF5722] rounded-br-sm pointer-events-none" />
                      <QRDisplay value={joinUrl} size={250} />
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-[#6B6280] text-center mt-3">
                      Escaneen con la cámara del celular para entrar
                    </p>
                  </div>

                  {/* ACTIONS: Share buttons & URL bar */}
                  <div className="w-full shrink-0 space-y-2.5">
                    <div id="tour-share-links" className="w-full grid grid-cols-2 gap-2.5">
                      <button
                        onClick={handleShareWhatsApp}
                        className="arcade-btn-mint py-3 px-3.5 rounded-xl font-tactical font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.961.897 2.796.897 3.182 0 5.769-2.587 5.769-5.766.001-3.181-2.586-5.766-5.769-5.766zm9.969 5.766c0 5.514-4.486 10-10 10-1.745 0-3.376-.452-4.801-1.241l-5.2 1.361 1.385-5.066c-.928-1.503-1.464-3.267-1.464-5.054 0-5.514 4.486-10 10-10 5.514 0 10 4.486 10 10z" />
                        </svg>
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={handleCopyLink}
                        className="arcade-btn py-3 px-3.5 rounded-xl font-tactical font-black text-xs flex items-center justify-center gap-2 cursor-pointer text-[#181226] hover:text-[#FF5722]"
                      >
                        {copied ? (
                          <span className="text-[#059669] font-black">¡Copiado!</span>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copiar Link</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* URL Display with Manual Override button */}
                    <div className="w-full bg-[#FAF7F2] px-3.5 py-2.5 rounded-xl border border-[#EAE3D5] flex items-center justify-between gap-2 text-left shadow-inner">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722] shrink-0" />
                        <span className="mono text-[10.5px] text-[#181226] font-bold truncate select-all">
                          {joinUrl}
                        </span>
                      </div>
                      <button
                        onClick={() => setIsEditingUrl(!isEditingUrl)}
                        className="text-[10px] font-mono font-bold text-[#FF5722] hover:text-[#E11D48] px-2 py-0.5 rounded bg-white border border-[#EAE3D5] shrink-0 cursor-pointer shadow-2xs"
                      >
                        {isEditingUrl ? 'Cerrar' : 'IP'}
                      </button>
                    </div>

                    {isEditingUrl && (
                      <div className="w-full pt-2 border-t border-[#EAE3D5] flex gap-2">
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
                  </div>

                  {/* BOTTOM: Playlist Status & Edit Button */}
                  <div id="tour-playlist-strip" className="w-full pt-3 border-t border-[#EAE3D5] flex items-center justify-between gap-2.5 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] border border-[#FF5722]/30 flex items-center justify-center text-[#FF5722] shrink-0 shadow-2xs">
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-[#181226] truncate">
                          Playlist de la Partida
                        </p>
                        <p className="text-[11px] font-bold text-[#FF5722] truncate">
                          {playlist.length} {playlist.length === 1 ? 'canción cargada' : 'canciones cargadas'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSetupStep('playlist')}
                      className="arcade-btn px-3 py-2 rounded-xl text-xs font-black text-[#FF5722] hover:bg-[#FFF0EB] border border-[#FF5722]/30 flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 transition-all active:scale-95"
                      title="Volver a editar la playlist sin perder la partida ni los participantes"
                    >
                      <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span>Editar Playlist</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center space-y-2 my-auto">
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
          </div>

          {/* RIGHT COLUMN: Jugadores, Carga Manual y Equipos (7 cols) */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-0">
            <div id="tour-players-section" className="party-card p-3.5 sm:p-4 rounded-2xl flex-1 flex flex-col min-h-0 justify-between shadow-sm">
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
                        <div className="w-16 h-16 rounded-2xl bg-[#FF5722] text-white flex items-center justify-center shadow-lg relative">
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

                      <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2 content-start custom-scrollbar">
                        {players.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FAF7F2] hover:bg-white border border-[#EAE3D5] shadow-2xs hover:shadow-xs transition-all animate-fade-in"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-7 h-7 rounded-xl bg-[#FF5722] text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
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
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
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
              <div id="tour-action-bar" className="pt-2.5 border-t border-[#EAE3D5] shrink-0 w-full">
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

        {/* Interactive Guided Spotlight Tutorial */}
        <SpotlightTutorial
          steps={LOBBY_TUTORIAL_STEPS}
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
          storageKey="trivia_host_tutorial_seen"
        />
      </div>
    </div>
  );
}
