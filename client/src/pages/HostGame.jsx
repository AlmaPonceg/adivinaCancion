import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';
import { useSocketEvent, useSocketEmit } from '../hooks/useSocket';
import Scoreboard from '../components/Scoreboard';
import MusicPlayer from '../components/MusicPlayer';
import BuzzQueue from '../components/BuzzQueue';
import JudgePanel from '../components/JudgePanel';
import { playHostBuzzerSound } from '../utils/audioEffects';

export default function HostGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const emit = useSocketEmit();

  const { roomCode, teams: initialTeams, playlist: initialPlaylist } = location.state || {};

  const [teams, setTeams] = useState(initialTeams || []);
  const [playlist] = useState(() => {
    if (initialPlaylist && initialPlaylist.length > 0) return initialPlaylist;
    try {
      const saved = localStorage.getItem('trivia_playlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [gameState, setGameState] = useState('TEAMS_ASSIGNED');
  const [roundNumber, setRoundNumber] = useState(0);
  const [buzzQueue, setBuzzQueue] = useState([]);
  const [currentJudging, setCurrentJudging] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [musicDuration, setMusicDuration] = useState(() => {
    try {
      const saved = localStorage.getItem('trivia_play_duration');
      return saved ? Math.max(1, parseInt(saved, 10)) : 15;
    } catch {
      return 15;
    }
  });
  const musicPlayerRef = useRef(null);

  useEffect(() => {
    if (!roomCode) navigate('/');
  }, [roomCode, navigate]);

  // ── Socket Events ──────────────────────────────────────────

  useSocketEvent('round-started', (data) => {
    setGameState('ROUND_ACTIVE');
    setRoundNumber(data.roundNumber);
    setBuzzQueue([]);
    setCurrentJudging(null);
    setLastResult(null);
    setShowResult(false);
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
    if (data.nextUp) {
      setCurrentJudging(data.nextUp);
      setGameState('BUZZER_LOCKED');
    } else if (data.allBlocked) {
      setGameState('ROUND_END');
      setCurrentJudging(null);
      setLastResult({ type: 'all-blocked' });
      setShowResult(true);
      setTimeout(() => setShowResult(false), 3000);
    } else if (data.reopened) {
      setGameState('ROUND_ACTIVE');
      setCurrentJudging(null);
    }
  });

  useSocketEvent('game-over', (data) => {
    navigate('/gameover', { state: { rankings: data.rankings } });
  });

  // ── Actions ────────────────────────────────────────────────

  const startNextRound = useCallback(() => {
    try {
      if (roundNumber > 0) {
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

  const replayAudio = useCallback(() => {
    musicPlayerRef.current?.replay();
  }, []);

  const skipCurrentSong = useCallback(() => {
    try {
      musicPlayerRef.current?.nextAndPlay();
    } catch (audioErr) {
      console.warn('Audio playback warning:', audioErr);
    }

    socket.emit('start-round', { roomCode }, (res) => {
      if (res?.error) console.error('start-round error:', res.error);
    });

    setGameState('ROUND_ACTIVE');
    setBuzzQueue([]);
    setCurrentJudging(null);
  }, [roomCode]);

  const judgeCorrect = useCallback(async () => {
    try {
      await emit('judge-correct', { roomCode, points: currentJudging?.suggestedPoints });
    } catch (err) {
      console.error('Judge error:', err);
    }
  }, [emit, roomCode, currentJudging]);

  const judgeIncorrect = useCallback(async () => {
    try {
      await emit('judge-incorrect', { roomCode });
    } catch (err) {
      console.error('Judge error:', err);
    }
  }, [emit, roomCode]);

  const endGame = useCallback(async () => {
    if (window.confirm('¿Estás seguro de que querés terminar la partida y ver los resultados finales?')) {
      try {
        await emit('end-game', { roomCode });
      } catch (err) {
        console.error('End game error:', err);
      }
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

  if (!roomCode) return null;

  return (
    <div className="min-h-dvh pb-12 text-[var(--color-text-primary)]">
      {/* Header Bar */}
      <div className="bg-white/95 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-[#EAE3D5] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] shadow-[0_0_8px_#059669]" />
            <h1 className="font-display text-base sm:text-lg font-black text-[#181226]">ADIVINÁ LA CANCIÓN</h1>
          </div>
          <p className="mono text-xs text-[#6B6280]">
            Sala {roomCode} · Ronda {roundNumber}{playlist.length > 0 ? ` de ${playlist.length}` : ''}
          </p>
        </div>

        <button
          onClick={endGame}
          className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-tactical font-black text-[#E11D48] hover:bg-[#FFF0F3] border border-[#E11D48]/30 bg-white transition-colors cursor-pointer shadow-2xs"
        >
          Terminar Partida
        </button>
      </div>

      {/* Top Section: Team Scoreboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-5 sm:pt-6">
        <Scoreboard teams={teams} />
      </div>

      {/* Main Content Grid: Audio Deck on Left, Master Round Console on Right */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dedicated Audio Deck (No video, pure audio & visualizer) */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-6">
          <MusicPlayer
            ref={musicPlayerRef}
            roomCode={roomCode}
            playlist={playlist}
            gameState={gameState}
            onDurationChange={setMusicDuration}
          />
        </div>

        {/* Right Column: Unified Master Control Console */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-5">
          {/* Master Round Control Card */}
          <motion.div
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
                          ? 'Iniciar 1ª Canción y Ronda →'
                          : `Iniciar Siguiente Ronda (${roundNumber + 1}${playlist.length > 0 ? `/${playlist.length}` : ''}) →`}
                      </span>
                    </button>
                    <p className="text-xs text-[#6B6280] text-center font-medium">
                      Al presionar, la música sonará por el parlante y los pulsadores se activarán automáticamente en los celulares.
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

      {/* Result Overlay Banner */}
      <AnimatePresence>
        {showResult && lastResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 22 }}
              className={`p-8 sm:p-10 text-center max-w-md w-full rounded-[2rem] shadow-2xl border-2 bg-white ${
                lastResult.type === 'correct'
                  ? 'border-[#059669] shadow-[0_20px_50px_rgba(5,150,105,0.25)]'
                  : 'border-[#E11D48] shadow-[0_20px_50px_rgba(225,29,72,0.25)]'
              }`}
            >
              {lastResult.type === 'correct' ? (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-[#E6F9F0] border-2 border-[#059669] flex items-center justify-center mx-auto mb-5 shadow-lg text-[#059669] animate-bounce">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-[#FFF0F3] border-2 border-[#E11D48] flex items-center justify-center mx-auto mb-5 shadow-lg text-[#E11D48]">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
