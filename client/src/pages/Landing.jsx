import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-[var(--nm-bg)] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="nm-flat p-8 sm:p-14 rounded-3xl text-center max-w-md w-full"
      >
        {/* Neumorphic Emblem */}
        <div className="flex justify-center mb-6">
          <div className="nm-inset w-16 h-16 rounded-full flex items-center justify-center">
            <div className="nm-convex w-8 h-8 rounded-full flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
            </div>
          </div>
        </div>

        <p className="label mb-2">Edición Cumpleaños</p>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-3 text-[var(--color-text-primary)]">
          Trivia<br />
          <span className="text-[var(--color-accent)]">Musical</span>
        </h1>

        <div className="accent-line mx-auto mb-5" />

        <p className="text-[var(--color-text-secondary)] text-sm mb-10 leading-relaxed max-w-xs mx-auto">
          Descubran quién conoce mejor las canciones. En tiempo real, con pulsador táctil en tu celular.
        </p>

        <div className="flex flex-col gap-3.5">
          <button
            onClick={() => navigate('/host')}
            className="nm-btn-primary py-4 px-6 rounded-xl font-bold text-sm tracking-wide shadow-sm"
          >
            Crear Partida (Host)
          </button>

          <button
            onClick={() => navigate('/play')}
            className="nm-btn py-4 px-6 rounded-xl font-bold text-sm text-[var(--color-text-primary)] tracking-wide"
          >
            Unirse como Jugador
          </button>
        </div>
      </motion.div>
    </div>
  );
}
