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
  const [mobileTab, setMobileTab] = useState('controls');
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
    setMobileTab('controls');
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
      await emit('judge-correct', { roomCode, points: 1 });
    } catch (err) {
      console.error('Judge error:', err);
    }
  }, [emit, roomCode]);

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
            Sala {roomCode} · Ronda {roundNumber}
          </p>
        </div>

        <button
          onClick={endGame}
          className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-black text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
        >
          Terminar Partida
        </button>
      </div>

      {/* Scoreboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-5 sm:pt-6">
        <Scoreboard teams={teams} />
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 pt-4">
        <div className="p-1.5 bg-slate-100 rounded-2xl flex gap-2 border border-slate-200">
          <button
            onClick={() => setMobileTab('controls')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'controls'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Control y Juez
            {gameState === 'BUZZER_LOCKED' && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setMobileTab('music')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
              mobileTab === 'music'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Música {playlist.length > 0 ? `(${playlist.length})` : ''}
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 sm:py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Music Player (with Playlist queue) */}
        <div className={`lg:col-span-2 ${mobileTab === 'music' ? 'block' : 'hidden lg:block'}`}>
          <MusicPlayer
            ref={musicPlayerRef}
            roomCode={roomCode}
            playlist={playlist}
            onStartRound={startRound}
            gameState={gameState}
          />
        </div>

        {/* Right: Game & Judge Controls */}
        <div className={`space-y-6 ${mobileTab === 'controls' ? 'block' : 'hidden lg:block'}`}>
          {/* Round Controls */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="nm-flat p-5 sm:p-6 rounded-3xl"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                Control de Ronda
              </p>
              <span className="mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                {gameState}
              </span>
            </div>

            {(gameState === 'TEAMS_ASSIGNED' || gameState === 'ROUND_END') && (
              <button
                onClick={startNextRound}
                className="nm-btn-primary w-full py-4 rounded-2xl font-black text-base shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{roundNumber === 0 ? 'Iniciar Canción y 1ª Ronda' : 'Siguiente Ronda (Próxima Canción) →'}</span>
              </button>
            )}

            {gameState === 'ROUND_ACTIVE' && (
              <div className="space-y-3">
                <div className="p-5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                    <span className="text-indigo-900 font-black text-base">
                      Música sonando · Pulsadores activos
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs font-medium">
                    Esperando que algún participante pulse en su celular...
                  </p>
                </div>

                <button
                  onClick={skipCurrentSong}
                  className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Si nadie sabe la canción, saltar a la siguiente"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  Nadie la sabe: Saltar a Siguiente Canción
                </button>
              </div>
            )}

            {(gameState === 'BUZZER_LOCKED' || currentJudging || buzzQueue.length > 0) && (currentJudging || buzzQueue[0]) && (
              <JudgePanel
                currentBuzz={currentJudging || buzzQueue[0]}
                onCorrect={judgeCorrect}
                onIncorrect={judgeIncorrect}
              />
            )}
          </motion.div>

          {/* Buzz Queue */}
          {buzzQueue.length > 0 && (
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
                    {' '}sumó {lastResult.pointsAwarded} punto para{' '}
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
