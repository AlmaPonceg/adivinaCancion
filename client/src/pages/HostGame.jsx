import { useState, useEffect, useCallback } from 'react';
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
  const [mobileTab, setMobileTab] = useState('controls'); // 'controls' | 'music'

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
    setBuzzQueue(data.buzzQueue);
  });

  useSocketEvent('round-result', (data) => {
    setGameState('ROUND_END');
    setTeams(prev => {
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

  const startRound = useCallback(async () => {
    try { await emit('start-round', { roomCode }); }
    catch (err) { console.error('Start round error:', err); }
  }, [emit, roomCode]);

  const judgeCorrect = useCallback(async () => {
    try { await emit('judge-correct', { roomCode, points: 1 }); }
    catch (err) { console.error('Judge error:', err); }
  }, [emit, roomCode]);

  const judgeIncorrect = useCallback(async () => {
    try { await emit('judge-incorrect', { roomCode }); }
    catch (err) { console.error('Judge error:', err); }
  }, [emit, roomCode]);

  const endGame = useCallback(async () => {
    if (window.confirm('¿Estás seguro de que querés terminar la partida y ver los resultados finales?')) {
      try { await emit('end-game', { roomCode }); }
      catch (err) { console.error('End game error:', err); }
    }
  }, [emit, roomCode]);

  if (!roomCode) return null;

  return (
    <div className="min-h-dvh bg-[var(--nm-bg)] pb-12">
      {/* Header Bar */}
      <div className="nm-flat-sm sticky top-0 z-30 px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-black/5">
        <div>
          <h1 className="text-base sm:text-lg font-extrabold tracking-tight">Trivia Musical</h1>
          <p className="mono text-xs text-[var(--color-text-muted)] mt-0.5">
            Sala {roomCode} · Ronda {roundNumber}
          </p>
        </div>

        <button
          onClick={endGame}
          className="nm-btn px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-700"
        >
          Terminar juego
        </button>
      </div>

      {/* Scoreboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6">
        <Scoreboard teams={teams} />
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 pt-4">
        <div className="nm-inset p-1.5 rounded-xl flex gap-2">
          <button
            onClick={() => setMobileTab('controls')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'controls'
                ? 'nm-flat text-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            Control y Juez
            {gameState === 'BUZZER_LOCKED' && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setMobileTab('music')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'music'
                ? 'nm-flat text-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            Música {playlist.length > 0 ? `(${playlist.length})` : ''}
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Music Player (with Playlist queue) */}
        <div className={`lg:col-span-2 ${mobileTab === 'music' ? 'block' : 'hidden lg:block'}`}>
          <MusicPlayer roomCode={roomCode} playlist={playlist} />
        </div>

        {/* Right: Game & Judge Controls */}
        <div className={`space-y-6 ${mobileTab === 'controls' ? 'block' : 'hidden lg:block'}`}>
          {/* Round Controls */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="nm-flat p-5 sm:p-6 rounded-2xl"
          >
            <p className="label mb-4">Control de ronda</p>

            {(gameState === 'TEAMS_ASSIGNED' || gameState === 'ROUND_END') && (
              <button
                onClick={startRound}
                className="nm-btn-primary w-full py-4 rounded-xl font-bold text-base shadow-sm"
              >
                {roundNumber === 0 ? '▶ Iniciar primera ronda' : '▶ Iniciar siguiente ronda'}
              </button>
            )}

            {gameState === 'ROUND_ACTIVE' && (
              <div className="nm-inset p-6 rounded-xl text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                  <span className="text-[var(--color-accent)] font-extrabold text-base">
                    Música sonando · Buzzers activos
                  </span>
                </div>
                <p className="text-[var(--color-text-muted)] text-xs mt-1">
                  Esperando que algún participante pulse en su celular...
                </p>
              </div>
            )}

            {gameState === 'BUZZER_LOCKED' && currentJudging && (
              <JudgePanel
                currentBuzz={currentJudging}
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="nm-flat p-8 sm:p-12 text-center max-w-md w-full rounded-2xl"
            >
              {lastResult.type === 'correct' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500
                                  flex items-center justify-center mx-auto mb-5 shadow-sm">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-extrabold mb-2 text-emerald-800">¡Respuesta Correcta!</h2>
                  <p className="text-[var(--color-text-secondary)] text-sm sm:text-base leading-relaxed">
                    <span className="font-extrabold" style={{ color: lastResult.teamColor }}>
                      {lastResult.playerName}
                    </span>
                    {' '}sumó {lastResult.pointsAwarded} punto{lastResult.pointsAwarded !== 1 ? 's' : ''} para{' '}
                    <span className="font-extrabold" style={{ color: lastResult.teamColor }}>
                      {lastResult.teamName}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-rose-100 border-2 border-rose-500
                                  flex items-center justify-center mx-auto mb-5 shadow-sm">
                    <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-extrabold mb-2 text-rose-800">Ronda terminada</h2>
                  <p className="text-[var(--color-text-secondary)] text-sm">
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
