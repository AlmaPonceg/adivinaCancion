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
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Winner Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="nm-flat p-8 rounded-3xl text-center mb-6 relative overflow-hidden"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-black uppercase tracking-wider mb-4 border border-amber-200">
            🏆 ¡Gran Campeón!
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-slate-900">
            Equipo Ganador
          </h1>

          <div
            className="p-6 rounded-2xl border-2 text-center bg-slate-50 shadow-xs"
            style={{
              borderColor: winner?.color,
            }}
          >
            <p className="text-2xl font-black mb-1" style={{ color: winner?.color }}>
              {winner?.name}
            </p>
            <p className="mono text-4xl font-black text-slate-900">
              {winner?.score}{' '}
              <span className="text-sm font-bold text-slate-500">
                {winner?.score === 1 ? 'punto' : 'puntos'}
              </span>
            </p>
          </div>
        </motion.div>

        {/* Rankings Leaderboard */}
        <div className="space-y-3">
          {rankings.map((team, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

            return (
              <motion.div
                key={team.name}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4"
                style={{
                  borderLeft: `5px solid ${team.color}`,
                }}
              >
                {/* Position */}
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-black text-slate-700 shrink-0">
                  {medal}
                </div>

                {/* Team */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: team.color }}
                    />
                    <p className="font-black text-sm truncate text-slate-900">
                      {team.name}
                    </p>
                  </div>
                  <p className="text-slate-500 text-xs truncate">
                    {team.players.join(', ')}
                  </p>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <p className="mono text-2xl font-black text-slate-900">
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
            className="nm-btn-primary px-8 py-4 rounded-2xl font-black text-sm shadow-md"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
