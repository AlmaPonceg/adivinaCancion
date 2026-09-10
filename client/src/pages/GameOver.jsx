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
      ? [rankings[0].color, '#3182CE', '#E0E5EC']
      : ['#3182CE', '#E53E3E', '#E0E5EC'];

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.55 },
      colors,
      ticks: 200,
    });

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
    <div className="min-h-dvh bg-[var(--nm-bg)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Winner Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="nm-flat p-8 rounded-3xl text-center mb-8"
        >
          <p className="label mb-2">Resultado final</p>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 text-[var(--color-text-primary)]">
            Equipo Ganador
          </h1>

          <div className="accent-line mx-auto mb-5" />

          <div
            className="nm-inset inline-block px-8 py-5 rounded-2xl"
            style={{
              borderLeft: `4px solid ${winner?.color}`,
            }}
          >
            <p className="text-xl font-extrabold" style={{ color: winner?.color }}>
              {winner?.name}
            </p>
            <p className="mono text-3xl font-black text-[var(--color-text-primary)] mt-1">
              {winner?.score} <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                {winner?.score === 1 ? 'punto' : 'puntos'}
              </span>
            </p>
          </div>
        </motion.div>

        {/* Rankings */}
        <div className="space-y-3">
          {rankings.map((team, index) => (
            <motion.div
              key={team.name}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="nm-flat-sm p-4 rounded-xl flex items-center gap-4"
              style={{
                borderLeft: `3px solid ${team.color}`,
              }}
            >
              {/* Position */}
              <div className="nm-inset w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-[var(--color-text-secondary)] shrink-0">
                #{index + 1}
              </div>

              {/* Team */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                  <p className="font-bold text-sm truncate" style={{ color: team.color }}>
                    {team.name}
                  </p>
                </div>
                <p className="text-[var(--color-text-muted)] text-xs truncate">
                  {team.players.join(', ')}
                </p>
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                <p className="mono text-2xl font-black text-[var(--color-text-primary)]">{team.score}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Play Again Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="nm-btn-primary px-8 py-3.5 rounded-xl font-bold text-sm"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
