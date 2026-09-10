import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function GameOver() {
  const location = useLocation();
  const navigate = useNavigate();
  const { rankings } = location.state || {};

  useEffect(() => {
    if (!rankings) {
      navigate('/');
      return;
    }

    const colors = rankings?.[0]?.color
      ? [rankings[0].color, '#D4A853', '#F0EBE3']
      : ['#D4A853', '#E8665A', '#F0EBE3'];

    // Initial burst
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.55 },
      colors,
      ticks: 200,
    });

    // Side streams
    const end = Date.now() + 3500;
    const frame = () => {
      confetti({ particleCount: 2, angle: 60, spread: 45, origin: { x: 0, y: 0.65 }, colors, ticks: 150 });
      confetti({ particleCount: 2, angle: 120, spread: 45, origin: { x: 1, y: 0.65 }, colors, ticks: 150 });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [rankings, navigate]);

  if (!rankings) return null;

  const winner = rankings[0];

  return (
    <div className="min-h-dvh bg-glow noise flex flex-col items-center justify-center p-6">
      {/* Glow behind winner */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[150px] opacity-10"
          style={{ backgroundColor: winner?.color || '#D4A853' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Winner announcement */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          <p className="label mb-4">Resultado final</p>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
            Ganador
          </h1>

          <div className="accent-line mx-auto mb-6" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', damping: 15 }}
            className="inline-block px-6 py-4 rounded-xl"
            style={{
              background: `${winner?.color}12`,
              border: `1px solid ${winner?.color}40`,
            }}
          >
            <p className="text-xl font-bold" style={{ color: winner?.color }}>
              {winner?.name}
            </p>
            <p className="mono text-3xl font-bold text-[var(--color-text-primary)] mt-1">
              {winner?.score} <span className="text-base font-normal text-[var(--color-text-muted)]">
                {winner?.score === 1 ? 'punto' : 'puntos'}
              </span>
            </p>
          </motion.div>
        </motion.div>

        {/* Rankings */}
        <div className="space-y-2.5">
          {rankings.map((team, index) => (
            <motion.div
              key={team.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.12 }}
              className={`card p-4 flex items-center gap-4 ${
                index === 0 ? 'ring-1' : ''
              }`}
              style={index === 0 ? { borderColor: `${team.color}50` } : {}}
            >
              {/* Position */}
              <div
                className={`mono w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                  index === 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
                }`}
                style={{
                  background: index === 0 ? 'var(--color-accent-soft)' : 'var(--color-bg-elevated)',
                }}
              >
                {index + 1}
              </div>

              {/* Team */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                  <p className="font-semibold truncate" style={{ color: team.color }}>
                    {team.name}
                  </p>
                </div>
                <p className="text-[var(--color-text-muted)] text-xs truncate">
                  {team.players.join(', ')}
                </p>
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                <p className="mono text-2xl font-bold">{team.score}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Play Again */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-10"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            className="px-8 py-3.5 rounded-xl font-semibold
                       bg-[var(--color-accent)] text-[var(--color-bg-primary)]
                       hover:bg-[var(--color-accent-dim)]
                       transition-colors duration-200 cursor-pointer"
          >
            Jugar de nuevo
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
