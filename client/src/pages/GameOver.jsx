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
      ? [rankings[0].color, '#6366F1', '#EC4899', '#F59E0B', '#10B981']
      : ['#6366F1', '#EC4899', '#F59E0B'];

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.55 },
      colors,
      ticks: 220,
    });

    const end = Date.now() + 3500;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, colors, ticks: 160 });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, colors, ticks: 160 });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [rankings, navigate]);

  if (!rankings) return null;

  const winner = rankings[0];

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 bg-[var(--color-console-bg)] text-[var(--color-text-on-dark)]">
      <div className="w-full max-w-md">
        {/* Winner Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="console-card p-8 rounded-3xl text-center mb-6 relative overflow-hidden"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-950/60 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-4 border border-amber-800/80">
            <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1c1.98-.44 3.53-2.01 3.91-4.06C19.38 11.53 21 9.47 21 7V5c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
            </svg>
            Gran Campeón
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight mb-4 text-slate-100">
            Equipo Ganador
          </h1>

          <div
            className="p-6 rounded-2xl border-2 text-center bg-[#0B0F19] shadow-xs"
            style={{
              borderColor: winner?.color,
            }}
          >
            <p className="text-2xl font-black mb-1" style={{ color: winner?.color }}>
              {winner?.name}
            </p>
            <p className="mono text-4xl font-black text-slate-100">
              {winner?.score}{' '}
              <span className="text-sm font-bold text-slate-400">
                {winner?.score === 1 ? 'punto' : 'puntos'}
              </span>
            </p>
          </div>
        </motion.div>

        {/* Rankings Leaderboard */}
        <div className="space-y-3">
          {rankings.map((team, index) => {
            return (
              <motion.div
                key={team.name}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="p-4 rounded-2xl bg-[#111827] border border-slate-800 shadow-xs flex items-center gap-4"
                style={{
                  borderLeft: `5px solid ${team.color}`,
                }}
              >
                {/* Position Badge */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                    index === 0
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                      : index === 1
                      ? 'bg-slate-800 text-slate-200 border border-slate-700'
                      : index === 2
                      ? 'bg-orange-950/80 text-orange-300 border border-orange-800/80'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {index + 1}º
                </div>

                {/* Team */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: team.color }}
                    />
                    <p className="font-black text-sm truncate text-slate-100">
                      {team.name}
                    </p>
                  </div>
                  <p className="text-slate-400 text-xs truncate">
                    {team.players.map((p) => p.name || p).join(', ')}
                  </p>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <p className="mono text-2xl font-black text-[var(--color-neon-indigo)]">
                    {team.score}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Play Again Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="console-btn-primary px-8 py-4 rounded-2xl font-black text-sm shadow-md cursor-pointer"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
