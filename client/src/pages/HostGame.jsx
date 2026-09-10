import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';
import { useSocketEvent, useSocketEmit } from '../hooks/useSocket';
import Scoreboard from '../components/Scoreboard';
import MusicPlayer from '../components/MusicPlayer';
import BuzzQueue from '../components/BuzzQueue';
import JudgePanel from '../components/JudgePanel';

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

  const startNextRound = useCallback(async () => {
    try {
      if (roundNumber > 0) {
        musicPlayerRef.current?.nextAndPlay();
      } else {
        musicPlayerRef.current?.play();
      }
      await emit('start-round', { roomCode });
      setGameState('ROUND_ACTIVE');
      setBuzzQueue([]);
      setCurrentJudging(null);
    } catch (err) {
      console.error('Start round error:', err);
    }
  }, [emit, roomCode, roundNumber]);

  const replayAudio = useCallback(() => {
    musicPlayerRef.current?.replay();
  }, []);

  const skipCurrentSong = useCallback(async () => {
    try {
      musicPlayerRef.current?.nextAndPlay();
      await emit('start-round', { roomCode });
      setGameState('ROUND_ACTIVE');
      setBuzzQueue([]);
      setCurrentJudging(null);
    } catch (err) {
      console.error('Skip error:', err);
    }
  }, [emit, roomCode]);

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
    <div className="min-h-dvh pb-12">
      {/* Header Bar */}
      <div className="bg-white sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-base sm:text-lg font-black text-slate-900">Trivia Musical</h1>
          </div>
          <p className="mono text-xs text-slate-500">
            Sala {roomCode} · Ronda {roundNumber}{playlist.length > 0 ? ` de ${playlist.length}` : ''}
          </p>
        </div>

        <button
          onClick={endGame}
          className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-black text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
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
        <div className="lg:col-span-6 xl:col-span-5 space-y-5">
          <MusicPlayer
            ref={musicPlayerRef}
            roomCode={roomCode}
            playlist={playlist}
            gameState={gameState}
          />
        </div>

        {/* Right Column: Unified Master Control Console */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-5">
          {/* Master Round Control Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="nm-flat p-6 sm:p-7 rounded-3xl relative overflow-hidden"
          >
            {/* Header / State indicator */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Control de la Partida
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {gameState === 'ROUND_ACTIVE' && 'Música sonando en vivo · Pulsadores habilitados'}
                  {gameState === 'BUZZER_LOCKED' && 'Pulsador presionado · Decisión del Jurado'}
                  {gameState === 'ROUND_END' && 'Ronda finalizada · Podés pasar a la siguiente'}
                  {gameState === 'TEAMS_ASSIGNED' && 'Listo para comenzar la primera canción'}
                </p>
              </div>

              <span
                className={`mono text-xs font-black px-3 py-1 rounded-full border ${
                  gameState === 'ROUND_ACTIVE'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 animate-pulse'
                    : gameState === 'BUZZER_LOCKED'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                {gameState === 'ROUND_ACTIVE' && 'SONANDO'}
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
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                      Siguientes en cola si se equivoca:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {buzzQueue.slice(1).map((b, i) => (
                        <span
                          key={b.playerId}
                          className="text-xs px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-700 flex items-center gap-1.5"
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
                <div className="p-6 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1.5">
                    <span className="w-3 h-3 rounded-full bg-indigo-600 animate-ping" />
                    <span className="text-indigo-950 font-black text-lg">
                      Música sonando en los parlantes
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm font-medium">
                    Los pulsadores están habilitados en los teléfonos esperando respuestas...
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={replayAudio}
                    className="py-3.5 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    title="Volver a reproducir el clip de audio"
                  >
                    <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Repetir Audio (15s)
                  </button>

                  <button
                    onClick={skipCurrentSong}
                    className="py-3.5 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-rose-700 hover:text-rose-800 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    title="Si nadie sabe la canción, saltar a la siguiente"
                  >
                    <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                    Nadie Sabe: Saltar Canción
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {isPlaylistFinished ? (
                  <div className="space-y-3">
                    <button
                      onClick={finishGameDirectly}
                      className="w-full py-4 px-6 rounded-2xl font-black text-base shadow-lg flex items-center justify-center gap-2.5 cursor-pointer bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white transition-all transform active:scale-98"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <span>Ver Podio Final (¡Canciones Completadas!) →</span>
                    </button>
                    <p className="text-xs text-slate-500 text-center font-medium">
                      Se han jugado todas las canciones de la lista. Finalizá para revelar al equipo campeón.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={startNextRound}
                      className="nm-btn-primary w-full py-4 px-6 rounded-2xl font-black text-base shadow-md flex items-center justify-center gap-2.5 cursor-pointer transition-all active:translate-y-0.5"
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
                    <p className="text-xs text-slate-500 text-center font-medium">
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="bg-white p-8 sm:p-12 text-center max-w-md w-full rounded-3xl shadow-2xl border border-slate-100"
            >
              {lastResult.type === 'correct' ? (
                <>
                  <div className="w-18 h-18 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-sm">
                    <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black mb-2 text-emerald-800">
                    ¡Respuesta Correcta!
                  </h2>
                  <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                    <span className="font-black" style={{ color: lastResult.teamColor }}>
                      {lastResult.playerName}
                    </span>
                    {' '}sumó{' '}
                    <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      +{lastResult.pointsAwarded || 1} {lastResult.pointsAwarded === 1 ? 'punto' : 'puntos'}
                    </span>
                    {lastResult.elapsedSeconds !== undefined && (
                      <span className="text-slate-500 font-bold ml-1 text-xs">
                        (en {lastResult.elapsedSeconds}s)
                      </span>
                    )}
                    {' '}para{' '}
                    <span className="font-black" style={{ color: lastResult.teamColor }}>
                      {lastResult.teamName}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <div className="w-18 h-18 rounded-full bg-rose-100 border-2 border-rose-500 flex items-center justify-center mx-auto mb-5 shadow-sm">
                    <svg className="w-10 h-10 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black mb-2 text-rose-800">
                    Ronda Terminada
                  </h2>
                  <p className="text-slate-600 text-sm font-medium">
                    Todos los equipos fallaron. Nadie sumó puntos en esta ronda.
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
