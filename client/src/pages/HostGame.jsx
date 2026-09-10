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

  const { roomCode, teams: initialTeams } = location.state || {};

  const [teams, setTeams] = useState(initialTeams || []);
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
    // If on mobile and in music tab, switch to controls tab automatically
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
    <div className="min-h-dvh bg-glow noise pb-12">
      <div className="relative z-10">
        {/* Header Bar */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]/90 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight">Trivia Musical</h1>
              <p className="mono text-xs text-[var(--color-text-muted)] mt-0.5">
                Sala {roomCode} · Ronda {roundNumber}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={endGame}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium
                         bg-transparent border border-[var(--color-border)]
                         text-[var(--color-text-muted)] hover:border-[var(--color-coral)]/40 hover:text-[var(--color-coral)]
                         transition-all duration-200 cursor-pointer"
            >
              Terminar juego
            </motion.button>
          </div>
        </div>

        {/* Scoreboard (Always visible on mobile & desktop) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
          <Scoreboard teams={teams} />
        </div>

        {/* Mobile Tab Switcher (Visible only on mobile/tablet) */}
        <div className="lg:hidden max-w-7xl mx-auto px-4 pt-4">
          <div className="flex rounded-xl bg-[var(--color-bg-elevated)] p-1 border border-[var(--color-border)]">
            <button
              onClick={() => setMobileTab('controls')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'controls'
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)] shadow'
                  : 'text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              Control y Juez
              {gameState === 'BUZZER_LOCKED' && (
                <span className="w-2 h-2 rounded-full bg-[var(--color-coral)] animate-ping" />
              )}
            </button>
            <button
              onClick={() => setMobileTab('music')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                mobileTab === 'music'
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)] shadow'
                  : 'text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              Reproductor de Música
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Music Player (Desktop always, Mobile when tab is 'music') */}
          <div className={`lg:col-span-2 ${mobileTab === 'music' ? 'block' : 'hidden lg:block'}`}>
            <MusicPlayer roomCode={roomCode} />
          </div>

          {/* Right: Game & Judge Controls (Desktop always, Mobile when tab is 'controls') */}
          <div className={`space-y-6 ${mobileTab === 'controls' ? 'block' : 'hidden lg:block'}`}>
            {/* Round Controls */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-5 sm:p-6"
            >
              <p className="label mb-4">Control de ronda</p>

              {(gameState === 'TEAMS_ASSIGNED' || gameState === 'ROUND_END') && (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startRound}
                  className="w-full py-3.5 rounded-xl font-semibold
                             bg-[var(--color-accent)] text-[var(--color-bg-primary)]
                             hover:bg-[var(--color-accent-dim)]
                             transition-colors duration-200 cursor-pointer text-base shadow-md"
                >
                  {roundNumber === 0 ? 'Iniciar primera ronda' : 'Iniciar siguiente ronda'}
                </motion.button>
              )}

              {gameState === 'ROUND_ACTIVE' && (
                <div className="text-center py-6">
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-[var(--color-accent)] font-bold text-base"
                  >
                    Música sonando · Buzzers activos
                  </motion.div>
                  <p className="text-[var(--color-text-muted)] text-xs sm:text-sm mt-1.5">
                    Esperando que algún jugador pulse el botón en su celular...
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', damping: 20 }}
                className="card p-8 sm:p-12 text-center max-w-md w-full"
              >
                {lastResult.type === 'correct' ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[var(--color-correct)]/15 border-2 border-[var(--color-correct)]
                                    flex items-center justify-center mx-auto mb-5">
                      <svg className="w-8 h-8 text-[var(--color-correct)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">¡Correcto!</h2>
                    <p className="text-[var(--color-text-secondary)] leading-relaxed text-sm sm:text-base">
                      <span className="font-bold" style={{ color: lastResult.teamColor }}>
                        {lastResult.playerName}
                      </span>
                      {' '}sumó {lastResult.pointsAwarded} punto{lastResult.pointsAwarded !== 1 ? 's' : ''} para{' '}
                      <span className="font-bold" style={{ color: lastResult.teamColor }}>
                        {lastResult.teamName}
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[var(--color-text-muted)]/10 border-2 border-[var(--color-text-muted)]
                                    flex items-center justify-center mx-auto mb-5">
                      <svg className="w-8 h-8 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Ronda terminada</h2>
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
    </div>
  );
}
