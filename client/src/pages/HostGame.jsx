import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';
import { useSocketEvent, useSocketEmit } from '../hooks/useSocket';
import Scoreboard from '../components/Scoreboard';
import MusicPlayer from '../components/MusicPlayer';
import BuzzQueue from '../components/BuzzQueue';
import JudgePanel from '../components/JudgePanel';
import {
  playHostBuzzerSound,
  playCorrectSound,
  playIncorrectSound,
  playTickSound,
  playTimeoutSound,
} from '../utils/audioEffects';
import { useWakeLock } from '../hooks/useWakeLock';
import { hydratePlaylistTracks } from '../utils/audioStorage';
import { lobbyAudioManager } from '../utils/lobbyAudio';
import { parseSongAndArtist } from '../utils/trackHelper';
import SpotlightTutorial from '../components/SpotlightTutorial';

const GAME_TUTORIAL_STEPS = [
  {
    targetId: 'tour-game-scoreboard',
    title: '1. Tabla de Posiciones',
    description: 'Acá ves en vivo el puntaje de cada equipo o participante y quién va liderando la partida.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-game-music-player',
    title: '2. Reproductor de Audio',
    description: 'Controlá la reproducción, regulá el volumen general o ajustá cuántos segundos suena la canción antes de detenerse.',
    placement: 'right',
  },
  {
    targetId: 'tour-game-master-card',
    title: '3. Control de Ronda & Jurado',
    description: 'Presioná "Iniciar Ronda" para que suene la música. Cuando un jugador toque el pulsador en su celular, acá podrás marcar si acertó o falló.',
    placement: 'left',
  },
  {
    targetId: 'tour-game-autohost-btn',
    title: '4. Auto-Host (Todos Juegan)',
    description: 'Activá el modo Auto-Host si querés que el juego avance solo y las canciones se revelen automáticamente para que vos también juegues.',
    placement: 'bottom',
  },
];

export default function HostGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const emit = useSocketEmit();

  const stateData = location.state || {};

  const [roomCode] = useState(() => {
    return stateData.roomCode || localStorage.getItem('trivia_host_room') || '';
  });

  const [teams, setTeams] = useState(() => {
    if (stateData.teams && stateData.teams.length > 0) return stateData.teams;
    try {
      const saved = localStorage.getItem('trivia_teams');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [playlist, setPlaylist] = useState(() => {
    if (stateData.playlist && stateData.playlist.length > 0) return stateData.playlist;
    try {
      const saved = localStorage.getItem('trivia_playlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Hydrate local tracks from IndexedDB with active Object URLs
  useEffect(() => {
    let isMounted = true;
    async function hydrate() {
      if (playlist && playlist.length > 0) {
        const hydrated = await hydratePlaylistTracks(playlist);
        if (isMounted) setPlaylist(hydrated);
      }
    }
    hydrate();
    lobbyAudioManager.stop();
    return () => {
      isMounted = false;
    };
  }, []);

  // Keep screen awake while host is managing the game
  useWakeLock(true);

  // Fullscreen toggle state
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const [gameState, setGameState] = useState('TEAMS_ASSIGNED');
  const [roundNumber, setRoundNumber] = useState(0);
  const [buzzQueue, setBuzzQueue] = useState([]);
  const [currentJudging, setCurrentJudging] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
  const [musicDuration, setMusicDuration] = useState(() => {
    try {
      const saved = localStorage.getItem('trivia_play_duration');
      return saved ? Math.max(1, parseInt(saved, 10)) : 15;
    } catch {
      return 15;
    }
  });
  const musicPlayerRef = useRef(null);

  // Auto-Host ("Todos Juegan") state
  const [autoHostEnabled, setAutoHostEnabled] = useState(() => {
    if (typeof stateData.autoHostEnabled === 'boolean') return stateData.autoHostEnabled;
    try {
      return localStorage.getItem('trivia_auto_host') === 'true';
    } catch {
      return false;
    }
  });
  const [currentTrack, setCurrentTrack] = useState(null);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(null);
  const [isAutoAdvancePaused, setIsAutoAdvancePaused] = useState(false);
  const [speakCountdown, setSpeakCountdown] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Auto-show tutorial on first game entry if round hasn't started yet
  useEffect(() => {
    try {
      const seen = localStorage.getItem('trivia_host_game_tutorial_seen');
      if (!seen && roundNumber === 0) {
        const timer = setTimeout(() => setShowTutorial(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // Safe fallback
    }
  }, [roundNumber]);

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }
    // Re-join socket room as host
    socket.emit('host-join', { roomCode }, (res) => {
      if (res?.error) {
        console.warn('Host join warning:', res.error);
      }
    });
  }, [roomCode, navigate]);

  // ── Socket Events ──────────────────────────────────────────

  useSocketEvent('round-started', (data) => {
    setGameState('ROUND_ACTIVE');
    setRoundNumber(data.roundNumber);
    setBuzzQueue([]);
    setCurrentJudging(null);
    setLastResult(null);
    setShowResult(false);
    if (playlist && data.roundNumber > 0 && playlist[data.roundNumber - 1]) {
      setCurrentTrack(playlist[data.roundNumber - 1]);
    }
  });

  useSocketEvent('first-buzz', (data) => {
    setGameState('BUZZER_LOCKED');
    setCurrentJudging(data.buzzEntry);
    playHostBuzzerSound();
  });

  useSocketEvent('buzz-queue-updated', (data) => {
    setBuzzQueue(data.buzzQueue || []);
    if (!currentJudging && data.buzzQueue && data.buzzQueue.length > 0) {
      setCurrentJudging(data.buzzQueue[0]);
    }
  });

  useSocketEvent('round-result', (data) => {
    setGameState('ROUND_END');
    setTeams((prev) => {
      const updated = [...prev];
      if (data.scores) {
        data.scores.forEach((s, i) => {
          if (updated[i]) updated[i] = { ...updated[i], score: s.score };
        });
      }
      return updated;
    });
    setLastResult({ type: 'correct', ...data });
    setShowResult(true);
    setCurrentJudging(null);
    setTimeout(() => setShowResult(false), 3000);
  });

  useSocketEvent('round-judgment', (data) => {
    if (data.scores) {
      setTeams((prev) => {
        const updated = [...prev];
        data.scores.forEach((s, i) => {
          if (updated[i]) updated[i] = { ...updated[i], score: s.score };
        });
        return updated;
      });
    }

    if (data.nextUp) {
      setCurrentJudging(data.nextUp);
      setGameState('BUZZER_LOCKED');
      setBuzzQueue(data.buzzQueue || []);
      playHostBuzzerSound();
    } else if (data.allBlocked) {
      setGameState('ROUND_END');
      setCurrentJudging(null);
      setBuzzQueue([]);
      setLastResult({ type: 'all-blocked' });
      setShowResult(true);
      setTimeout(() => setShowResult(false), 3000);
    } else if (data.reopened) {
      setGameState('ROUND_ACTIVE');
      setCurrentJudging(null);
      setBuzzQueue([]);
    }
  });

  useSocketEvent('game-over', (data) => {
    navigate('/gameover', { state: { rankings: data.rankings } });
  });

  // ── Actions ────────────────────────────────────────────────

  const startNextRound = useCallback(() => {
    const nextRound = roundNumber + 1;
    try {
      if (musicPlayerRef.current?.playTrackForRound) {
        musicPlayerRef.current.playTrackForRound(nextRound);
      } else if (roundNumber > 0) {
        musicPlayerRef.current?.nextAndPlay();
      } else {
        musicPlayerRef.current?.play();
      }
    } catch (audioErr) {
      console.warn('Audio playback warning:', audioErr);
    }

    socket.emit('start-round', { roomCode }, (res) => {
      if (res?.error) console.error('start-round error:', res.error);
    });

    setGameState('ROUND_ACTIVE');
    setBuzzQueue([]);
    setCurrentJudging(null);
  }, [roomCode, roundNumber]);

  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!autoStartedRef.current && roundNumber === 0 && playlist && playlist.length > 0) {
      autoStartedRef.current = true;
      const t = setTimeout(() => {
        startNextRound();
      }, 700);
      return () => clearTimeout(t);
    }
  }, [playlist, roundNumber, startNextRound]);

  const replayAudio = useCallback(() => {
    musicPlayerRef.current?.replay();
  }, []);

  const skipCurrentSong = useCallback(() => {
    const nextRound = roundNumber + 1;
    try {
      if (musicPlayerRef.current?.playTrackForRound) {
        musicPlayerRef.current.playTrackForRound(nextRound);
      } else {
        musicPlayerRef.current?.nextAndPlay();
      }
    } catch (audioErr) {
      console.warn('Audio playback warning:', audioErr);
    }

    socket.emit('start-round', { roomCode }, (res) => {
      if (res?.error) console.error('start-round error:', res.error);
    });

    setGameState('ROUND_ACTIVE');
    setBuzzQueue([]);
    setCurrentJudging(null);
  }, [roomCode, roundNumber]);

  const judgeCorrect = useCallback(async () => {
    playCorrectSound();
    try {
      await emit('judge-correct', { roomCode, points: currentJudging?.suggestedPoints });
    } catch (err) {
      console.error('Judge error:', err);
    }
  }, [emit, roomCode, currentJudging]);

  const judgeIncorrect = useCallback(async () => {
    playIncorrectSound();
    try {
      await emit('judge-incorrect', { roomCode });
    } catch (err) {
      console.error('Judge error:', err);
    }
  }, [emit, roomCode]);

  // Keyboard navigation shortcuts when someone buzzes
  useEffect(() => {
    if (gameState !== 'BUZZER_LOCKED') return;

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;

      if (e.key === 'Enter' || e.key === '1' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        judgeCorrect();
      } else if (e.key === 'Backspace' || e.key === '2' || e.key.toLowerCase() === 'i') {
        e.preventDefault();
        judgeIncorrect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, judgeCorrect, judgeIncorrect]);

  const openEndGameModal = useCallback(() => {
    setShowEndGameConfirm(true);
  }, []);

  const confirmEndGame = useCallback(async () => {
    setShowEndGameConfirm(false);
    try {
      await emit('end-game', { roomCode });
    } catch (err) {
      console.error('End game error:', err);
    }
  }, [emit, roomCode]);

  const finishGameDirectly = useCallback(async () => {
    try {
      await emit('end-game', { roomCode });
    } catch (err) {
      console.error('End game error:', err);
    }
  }, [emit, roomCode]);

  const isPlaylistFinished = playlist.length > 0 && roundNumber >= playlist.length;

  useSocketEvent('auto-host-updated', (data) => {
    if (typeof data?.autoHostEnabled === 'boolean') {
      setAutoHostEnabled(data.autoHostEnabled);
    }
  });

  const toggleAutoHost = useCallback(() => {
    setAutoHostEnabled((prev) => {
      const nextVal = !prev;
      try {
        localStorage.setItem('trivia_auto_host', String(nextVal));
      } catch {
        /* */
      }
      socket.emit('set-auto-host', { roomCode, enabled: nextVal });
      return nextVal;
    });
  }, [roomCode]);

  // 1. Countdown for speaking when someone buzzes
  useEffect(() => {
    if (gameState !== 'BUZZER_LOCKED' || !(currentJudging || buzzQueue[0])) {
      setSpeakCountdown(null);
      return;
    }
    setSpeakCountdown(10);
    const interval = setInterval(() => {
      setSpeakCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          playTimeoutSound();
          return 0;
        }
        playTickSound();
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, currentJudging?.playerId, buzzQueue[0]?.playerId]);

  // 2. Auto-advance countdown when round ends in Auto-Host mode
  useEffect(() => {
    if (!autoHostEnabled || gameState !== 'ROUND_END' || isPlaylistFinished) {
      setAutoAdvanceTimer(null);
      return;
    }

    setAutoAdvanceTimer(5);
    setIsAutoAdvancePaused(false);

    const interval = setInterval(() => {
      setAutoAdvanceTimer((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoHostEnabled, gameState, roundNumber, isPlaylistFinished]);

  useEffect(() => {
    if (
      autoAdvanceTimer === 0 &&
      !isAutoAdvancePaused &&
      gameState === 'ROUND_END' &&
      !isPlaylistFinished
    ) {
      startNextRound();
    }
  }, [autoAdvanceTimer, isAutoAdvancePaused, gameState, isPlaylistFinished, startNextRound]);

  // 3. Auto-skip if nobody buzzes during music clip in Auto-Host mode
  useEffect(() => {
    if (gameState !== 'ROUND_ACTIVE' || !autoHostEnabled) return;

    const timeoutMs = (musicDuration + 7) * 1000;
    const timer = setTimeout(() => {
      if (gameState === 'ROUND_ACTIVE') {
        musicPlayerRef.current?.pause();
        setGameState('ROUND_END');
        setLastResult({
          type: 'timeout',
          title: currentTrack?.title,
          author: currentTrack?.author,
        });
        setShowResult(true);
        setTimeout(() => setShowResult(false), 3500);
      }
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [gameState, autoHostEnabled, musicDuration, currentTrack]);

  if (!roomCode) return null;

  const activeTrack = currentTrack || (playlist && roundNumber > 0 ? playlist[roundNumber - 1] : null);
  const { title: songTitle, artist: songArtist } = parseSongAndArtist(activeTrack);

  return (
    <div className="min-h-dvh pb-12 text-[var(--color-text-primary)]">
      {/* Header Bar */}
      <div className="bg-white sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-[#EAE3D5] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] shadow-[0_0_8px_#059669]" />
            <h1 className="font-display text-base sm:text-lg font-black text-[#181226]">ADIVINÁ LA CANCIÓN</h1>
          </div>
          <p className="mono text-xs text-[#6B6280]">
            Sala {roomCode} · Ronda {roundNumber}{playlist.length > 0 ? ` de ${playlist.length}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="arcade-btn px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#6B6280] hover:text-[#181226] flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
          >
            {isFullscreen ? (
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
            <span className="hidden sm:inline">{isFullscreen ? 'Ventana' : 'Pantalla Completa'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            className="arcade-btn px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#6B6280] hover:text-[#FF5722] flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Ver tutorial guiado de los controles de la partida"
          >
            <span className="w-4 h-4 rounded-full bg-[#FF5722] text-white flex items-center justify-center text-[10px] font-black leading-none">?</span>
            <span>Tutorial</span>
          </button>

          <button
            id="tour-game-autohost-btn"
            type="button"
            onClick={toggleAutoHost}
            className={`px-3 py-1.5 rounded-xl text-xs font-tactical font-black transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
              autoHostEnabled
                ? 'bg-[#E6F9F0] text-[#059669] border-[#059669]/50 hover:bg-[#D4F5E5]'
                : 'bg-[#FAF7F2] text-[#6B6280] border-[#EAE3D5] hover:text-[#181226]'
            }`}
            title="En modo Auto-Host la pantalla avanza automáticamente sin necesidad de un operador en la computadora"
          >
            <span className={`w-2 h-2 rounded-full ${autoHostEnabled ? 'bg-[#059669] animate-pulse' : 'bg-[#A098AE]'}`} />
            <span>Auto-Host: {autoHostEnabled ? 'ACTIVO' : 'MANUAL'}</span>
          </button>

          <button
            onClick={openEndGameModal}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-tactical font-black text-[#E11D48] hover:bg-[#FFF0F3] border border-[#E11D48]/30 bg-white transition-colors cursor-pointer shadow-2xs"
          >
            Terminar Partida
          </button>
        </div>
      </div>

      {/* Top Section: Team Scoreboard */}
      <div id="tour-game-scoreboard" className="max-w-7xl mx-auto px-4 sm:px-8 pt-5 sm:pt-6">
        <Scoreboard teams={teams} />
      </div>

      {/* Main Content Grid: Audio Deck on Left, Master Round Console on Right */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column on Desktop / Bottom on Mobile: Dedicated Audio Deck */}
        <div id="tour-game-music-player" className="lg:col-span-6 xl:col-span-5 space-y-6 order-2 lg:order-1">
          <MusicPlayer
            ref={musicPlayerRef}
            roomCode={roomCode}
            playlist={playlist}
            gameState={gameState}
            roundNumber={roundNumber}
            onDurationChange={setMusicDuration}
            onTrackChange={setCurrentTrack}
          />
        </div>

        {/* Right Column on Desktop / Top on Mobile: Unified Master Control Console */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-5 order-1 lg:order-2">
          {/* Master Round Control Card */}
          <motion.div
            id="tour-game-master-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="party-card p-6 sm:p-7 rounded-[2rem] relative overflow-hidden"
          >
            {/* Header / State indicator */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#EAE3D5]">
              <div>
                <h2 className="font-display text-base sm:text-lg font-black text-[#181226]">
                  Control de la Partida
                </h2>
                <p className="text-xs text-[#6B6280] font-medium mt-0.5">
                  {gameState === 'ROUND_ACTIVE' && 'Música sonando en vivo · Pulsadores habilitados'}
                  {gameState === 'BUZZER_LOCKED' && 'Pulsador presionado · Decisión del Jurado'}
                  {gameState === 'ROUND_END' && 'Ronda finalizada · Podés pasar a la siguiente'}
                  {gameState === 'TEAMS_ASSIGNED' && 'Listo para comenzar la primera canción'}
                </p>
              </div>

              <span
                className={`mono text-xs font-black px-3 py-1 rounded-xl border ${
                  gameState === 'ROUND_ACTIVE'
                    ? 'bg-[#E6F9F0] text-[#059669] border-[#059669]/50 shadow-xs'
                    : gameState === 'BUZZER_LOCKED'
                    ? 'bg-[#FFF0F3] text-[#E11D48] border-[#E11D48]/50 shadow-xs'
                    : gameState === 'ROUND_END'
                    ? 'bg-[#FFFBEB] text-[#D97706] border-[#F59E0B]/50 shadow-xs'
                    : 'bg-[#FAF7F2] text-[#6B6280] border-[#EAE3D5]'
                }`}
              >
                {gameState === 'ROUND_ACTIVE' && 'EN VIVO'}
                {gameState === 'BUZZER_LOCKED' && 'PULSADO'}
                {gameState === 'ROUND_END' && 'FINALIZADA'}
                {gameState === 'TEAMS_ASSIGNED' && 'LISTO'}
              </span>
            </div>

            {/* ACTION ZONE BY GAME STATE */}
            {gameState === 'BUZZER_LOCKED' && (currentJudging || buzzQueue[0]) ? (
              <div className="space-y-4">
                <JudgePanel
                  currentBuzz={currentJudging || buzzQueue[0]}
                  currentTrack={activeTrack}
                  isAutoHost={autoHostEnabled}
                  countdown={speakCountdown}
                  onCorrect={judgeCorrect}
                  onIncorrect={judgeIncorrect}
                />

                {buzzQueue.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-[#EAE3D5]">
                    <p className="badge-tag text-[#6B6280] mb-2">
                      Siguientes en cola si se equivoca:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {buzzQueue.slice(1).map((b, i) => (
                        <span
                          key={b.playerId}
                          className="text-xs px-2.5 py-1 rounded-xl bg-white border border-[#EAE3D5] font-bold text-[#181226] flex items-center gap-1.5 shadow-2xs"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: b.teamColor }}
                          />
                          #{i + 2} {b.playerName} ({b.teamName})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 text-center">
                  <button
                    onClick={skipCurrentSong}
                    className="py-2.5 px-4 rounded-xl border border-[#E11D48]/30 bg-[#FFF0F3] hover:bg-[#FFE4EA] text-[#E11D48] text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                    title="Pasar a la siguiente canción sin otorgar puntos"
                  >
                    <svg className="w-3.5 h-3.5 text-[#E11D48]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                    <span>Nadie sabe: Pasar a la siguiente canción (0 pts)</span>
                  </button>
                </div>
              </div>
            ) : gameState === 'ROUND_ACTIVE' ? (
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-[#FFF6F3] border border-[#FF5722]/30 text-center shadow-xs">
                  <div className="flex items-center justify-center gap-1.5 mb-2.5">
                    <span className="w-1.5 bg-[#FF5722] rounded-full eq-bar-1" />
                    <span className="w-1.5 bg-[#E11D48] rounded-full eq-bar-2" />
                    <span className="w-1.5 bg-[#059669] rounded-full eq-bar-3" />
                    <span className="w-1.5 bg-[#D97706] rounded-full eq-bar-4" />
                    <span className="w-1.5 bg-[#0284C7] rounded-full eq-bar-2" />
                  </div>
                  <h3 className="font-display text-lg font-black text-[#181226] mb-1">
                    MÚSICA SONANDO EN VIVO
                  </h3>
                  <p className="text-[#6B6280] text-xs sm:text-sm font-medium">
                    Los pulsadores están habilitados en los teléfonos esperando respuestas...
                  </p>
                </div>

                {/* Host Solution Card — Visible only to Dedicated Host */}
                {!autoHostEnabled && currentTrack && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF7F2] border-2 border-[#FF5722]/30 shadow-xs flex items-center justify-between text-left">
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-pulse shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#FF5722]">
                          Solución para el Host (Ronda #{roundNumber})
                        </span>
                      </div>
                      <p className="font-display text-sm sm:text-base font-black text-[#181226] truncate">
                        {currentTrack.title || currentTrack.name || 'Pista de audio'}
                      </p>
                      {currentTrack.author && (
                        <p className="text-xs font-bold text-[#6B6280] truncate mt-0.5">
                          Artista: <span className="text-[#181226] font-bold">{currentTrack.author}</span>
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-white text-[#6B6280] border border-[#EAE3D5] shrink-0 shadow-2xs">
                      Solo Host
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={replayAudio}
                    className="arcade-btn py-3.5 px-4 rounded-xl text-[#181226] text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sm"
                    title="Volver a reproducir el clip de audio"
                  >
                    <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Repetir Audio ({musicDuration}s)</span>
                  </button>

                  <button
                    onClick={skipCurrentSong}
                    className="py-3.5 px-4 rounded-xl border border-[#E11D48]/40 bg-[#FFF0F3] hover:bg-[#FFE4EA] text-[#E11D48] text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-98"
                    title="Si nadie sabe la canción, saltar a la siguiente"
                  >
                    <svg className="w-4 h-4 text-[#E11D48]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                    <span>Nadie Sabe: Saltar Canción</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {isPlaylistFinished ? (
                  <div className="space-y-3">
                    <button
                      onClick={finishGameDirectly}
                      className="arcade-btn-primary w-full py-4 px-6 rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <span>Ver Podio Final (¡Canciones Completadas!) →</span>
                    </button>
                    <p className="text-xs text-[#6B6280] text-center font-medium">
                      Se han jugado todas las canciones de la lista. Finalizá para revelar al equipo campeón.
                    </p>
                  </div>
                ) : autoHostEnabled && gameState === 'ROUND_END' && autoAdvanceTimer !== null ? (
                  <div className="p-5 rounded-2xl bg-[#FFF9F2] border-2 border-[#D97706]/40 text-center shadow-sm space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] animate-ping" />
                      <span className="badge-tag text-[#D97706] font-black uppercase text-xs">
                        MODO AUTO-HOST ACTIVO
                      </span>
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl font-black text-[#181226]">
                      {isAutoAdvancePaused ? 'Avance automático en pausa' : `Siguiente ronda en ${autoAdvanceTimer}s...`}
                    </h3>
                    <div className="flex items-center justify-center gap-2.5 pt-1">
                      <button
                        onClick={startNextRound}
                        className="arcade-btn-primary py-2.5 px-4 rounded-xl text-xs font-black shadow-md active:scale-98 cursor-pointer"
                      >
                        Iniciar Ya →
                      </button>
                      <button
                        onClick={() => setIsAutoAdvancePaused((prev) => !prev)}
                        className="arcade-btn py-2.5 px-4 rounded-xl text-xs font-black text-[#181226] border border-[#EAE3D5] shadow-2xs cursor-pointer"
                      >
                        {isAutoAdvancePaused ? 'Reanudar' : 'Pausar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={startNextRound}
                      className="arcade-btn-primary w-full py-4 px-6 rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {roundNumber === 0
                          ? (autoHostEnabled ? 'Iniciar Partida (Auto-Host) →' : 'Iniciar 1ª Canción y Ronda →')
                          : `Iniciar Siguiente Ronda (${roundNumber + 1}${playlist.length > 0 ? `/${playlist.length}` : ''}) →`}
                      </span>
                    </button>
                    <p className="text-xs text-[#6B6280] text-center font-medium">
                      {autoHostEnabled
                        ? 'En modo Auto-Host, las rondas y canciones avanzarán solas en pantalla.'
                        : 'Al presionar, la música sonará por el parlante y los pulsadores se activarán automáticamente en los celulares.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Persistent Buzz Queue (if someone has buzzed) */}
          {buzzQueue.length > 0 && gameState !== 'BUZZER_LOCKED' && (
            <BuzzQueue queue={buzzQueue} currentJudging={currentJudging} />
          )}
        </div>
      </div>

      {/* Result Overlay Banner (Hardware isolated, pure GPU composited CSS for zero latency) */}
      {showResult && lastResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E0A16]/80 animate-fade-in select-none"
          style={{ contain: 'strict', isolation: 'isolate' }}
        >
          <div
            style={{ transform: 'translate3d(0, 0, 0)', willChange: 'transform' }}
            className={`p-7 sm:p-9 text-center max-w-md w-full rounded-[2rem] shadow-2xl border-2 bg-white animate-fade-in ${
              lastResult.type === 'correct'
                ? 'border-[#059669]'
                : lastResult.type === 'timeout'
                ? 'border-[#D97706]'
                : 'border-[#E11D48]'
            }`}
          >
            {lastResult.type === 'correct' ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[#E6F9F0] border-2 border-[#059669] flex items-center justify-center mx-auto mb-4 shadow-xs text-[#059669]">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="badge-tag text-[#059669] mb-1">
                  ¡PUNTO CONCEDIDO!
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-black mb-3 text-[#181226] tracking-tight">
                  ¡Respuesta Correcta!
                </h2>
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] mb-2 shadow-inner">
                  <p className="text-[#181226] text-sm sm:text-base leading-relaxed">
                    <span className="font-display font-black text-lg" style={{ color: lastResult.teamColor }}>
                      {lastResult.playerName}
                    </span>
                    {' '}sumó{' '}
                    <span className="font-black text-[#059669] bg-[#E6F9F0] px-2.5 py-1 rounded-lg border border-[#059669]/40">
                      +{lastResult.pointsAwarded || 1} {lastResult.pointsAwarded === 1 ? 'punto' : 'puntos'}
                    </span>
                  </p>
                  <p className="text-xs font-bold text-[#6B6280] mt-2">
                    Equipo:{' '}
                    <span className="font-black" style={{ color: lastResult.teamColor }}>
                      {lastResult.teamName}
                    </span>
                    {lastResult.elapsedSeconds !== undefined && (
                      <span className="ml-2 mono text-[#D97706]">
                        ({lastResult.elapsedSeconds}s)
                      </span>
                    )}
                  </p>

                  {(lastResult.title || songTitle) && (
                    <div className="p-3.5 rounded-xl bg-white border border-[#059669]/30 mt-3 text-left shadow-2xs">
                      <p className="text-[10px] font-bold text-[#059669] uppercase tracking-wider">
                        Canción acertada:
                      </p>
                      <h3 className="text-[#181226] font-display font-black text-base">
                        {lastResult.title || songTitle}
                      </h3>
                      {(lastResult.author || songArtist) && (
                        <p className="text-xs text-[#6B6280] font-semibold mt-0.5">
                          {lastResult.author || songArtist}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : lastResult.type === 'timeout' ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[#FFFBEB] border-2 border-[#D97706] flex items-center justify-center mx-auto mb-4 shadow-sm text-[#D97706]">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="badge-tag text-[#D97706] mb-1">
                  TIEMPO AGOTADO
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-black mb-3 text-[#181226] tracking-tight">
                  Nadie adivinó a tiempo
                </h2>
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] shadow-inner">
                  <p className="text-xs font-bold text-[#6B6280] mb-1">La canción era:</p>
                  <h3 className="text-[#181226] font-display font-black text-lg">
                    {lastResult.title || songTitle || 'Canción en juego'}
                  </h3>
                  {(lastResult.author || songArtist) && (
                    <p className="text-xs text-[#6B6280] font-semibold mt-0.5">
                      {lastResult.author || songArtist}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[#FFF0F3] border-2 border-[#E11D48] flex items-center justify-center mx-auto mb-4 shadow-sm text-[#E11D48]">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="badge-tag text-[#E11D48] mb-1">
                  RONDA DESIERTA
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-black mb-3 text-[#181226] tracking-tight">
                  Ronda Terminada
                </h2>
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] shadow-inner">
                  <p className="text-[#6B6280] text-xs sm:text-sm font-medium leading-relaxed">
                    Todos los equipos fallaron o se agotó el tiempo. Nadie sumó puntos en esta ronda.
                  </p>
                  {(lastResult.title || songTitle) && (
                    <div className="p-3.5 rounded-xl bg-white border border-[#EAE3D5] mt-3 text-left shadow-2xs">
                      <p className="text-[10px] font-bold text-[#6B6280] uppercase tracking-wider">
                        La canción era:
                      </p>
                      <h3 className="text-[#181226] font-display font-black text-base">
                        {lastResult.title || songTitle}
                      </h3>
                      {(lastResult.author || songArtist) && (
                        <p className="text-xs text-[#6B6280] font-semibold mt-0.5">
                          {lastResult.author || songArtist}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Styled Custom Modal: Terminar Partida (Replaces native window.confirm) */}
      {showEndGameConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E0A16]/80 animate-fade-in select-none"
          style={{ contain: 'strict', isolation: 'isolate' }}
          onClick={() => setShowEndGameConfirm(false)}
        >
          <div
            className="party-card p-6 sm:p-8 max-w-md w-full rounded-[2rem] bg-white border-2 border-[#EAE3D5] text-center shadow-2xl animate-fade-in text-[#181226]"
            style={{ transform: 'translate3d(0, 0, 0)', willChange: 'transform' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] border-2 border-[#E11D48]/30 flex items-center justify-center mx-auto mb-4 text-[#E11D48] shadow-xs">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <p className="badge-tag text-[#E11D48] mb-1">FINALIZAR JUEGO</p>
            <h3 className="font-display text-xl sm:text-2xl font-black text-[#181226] tracking-tight mb-2">
              ¿Terminar la partida ahora?
            </h3>
            <p className="text-xs sm:text-sm text-[#6B6280] font-medium leading-relaxed mb-6">
              Se calcularán los puntajes finales de todos los equipos y se revelará el podio de campeones en pantalla.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowEndGameConfirm(false)}
                className="arcade-btn py-3 px-4 rounded-xl text-xs font-black cursor-pointer shadow-xs"
              >
                Continuar Jugando
              </button>
              <button
                onClick={confirmEndGame}
                className="py-3 px-4 rounded-xl text-xs font-black text-white bg-[#E11D48] hover:brightness-110 cursor-pointer shadow-md active:scale-98 transition-all"
              >
                Sí, Terminar Partida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Game Controls Guided Tutorial */}
      <SpotlightTutorial
        steps={GAME_TUTORIAL_STEPS}
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        storageKey="trivia_host_game_tutorial_seen"
      />
    </div>
  );
}
