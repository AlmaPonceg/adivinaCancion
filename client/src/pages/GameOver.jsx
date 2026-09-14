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
      ? [rankings[0].color, '#FF5E36', '#FF1493', '#FFC837', '#05FFA1']
      : ['#FF5E36', '#FF1493', '#FFC837', '#05FFA1'];

    confetti({
      particleCount: 130,
      spread: 100,
      origin: { y: 0.55 },
      colors,
      ticks: 240,
    });

    const end = Date.now() + 4000;
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
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 text-[var(--color-text-primary)] relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        {/* Winner Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="party-card party-card-glow p-5 sm:p-8 rounded-[2rem] text-center mb-6 relative overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#F59E0B]/70" />
            <span className="badge-tag text-[#D97706] flex items-center gap-1.5 font-black text-[10px] sm:text-xs">
              <svg className="w-4 h-4 text-[#D97706]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1c1.98-.44 3.53-2.01 3.91-4.06C19.38 11.53 21 9.47 21 7V5c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
              </svg>
              Podio Final · Adiviná la Canción
            </span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#F59E0B]/70" />
          </div>

          <h1 className="font-display text-2xl sm:text-4xl font-black tracking-tight mb-4 text-[#181226]">
            Equipo Ganador
          </h1>

          <div
            className="p-4 sm:p-6 rounded-2xl border-2 text-center bg-[#FAF7F2] shadow-sm relative overflow-hidden"
            style={{
              borderColor: winner?.color || '#D97706',
            }}
          >
            <p className="font-display text-xl sm:text-3xl font-black mb-1 break-words" style={{ color: winner?.color || '#D97706' }}>
              {winner?.name}
            </p>
            <p className="mono text-3xl sm:text-5xl font-black text-[#181226] my-2">
              {winner?.score}{' '}
              <span className="text-sm font-bold text-[#6B6280]">
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
                className="p-4 rounded-2xl bg-white border border-[#EAE3D5] shadow-sm flex items-center gap-4"
                style={{
                  borderLeft: `5px solid ${team.color}`,
                }}
              >
                {/* Position Badge */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                    index === 0
                      ? 'bg-[#FFFBEB] text-[#D97706] border border-[#F59E0B]/40 shadow-xs'
                      : index === 1
                      ? 'bg-[#F1ECE3] text-[#181226] border border-[#DDD5C5]'
                      : index === 2
                      ? 'bg-[#FFF0EB] text-[#FF5722] border border-[#FF5722]/30'
                      : 'bg-[#FAF7F2] text-[#6B6280] border border-[#EAE3D5]'
                  }`}
                >
                  {index + 1}º
                </div>

                {/* Team */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: team.color }}
                    />
                    <p className="font-display font-black text-sm truncate text-[#181226]">
                      {team.name}
                    </p>
                  </div>
                  <p className="text-[#6B6280] text-xs truncate">
                    {team.players.map((p) => p.name || p).join(', ')}
                  </p>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <p className="mono text-2xl font-black text-[#D97706]">
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
            className="arcade-btn-primary px-8 py-4 rounded-2xl font-black text-base shadow-lg cursor-pointer"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
