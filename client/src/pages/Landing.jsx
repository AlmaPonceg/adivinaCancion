import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-glow noise flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-md"
      >
        {/* Mark */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-full border-2 border-[var(--color-accent)] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[var(--color-accent)]" />
          </div>
        </div>

        <p className="label mb-4">Edición Cumpleaños</p>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-none mb-4">
          Trivia<br />
          <span className="text-[var(--color-accent)]">Musical</span>
        </h1>

        <div className="accent-line mx-auto mb-6" />

        <p className="text-[var(--color-text-secondary)] text-base mb-14 max-w-xs mx-auto leading-relaxed">
          Pongan a prueba quién conoce mejor las canciones. Tiempo real, sin excusas.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/host')}
            className="px-8 py-4 rounded-xl font-semibold text-base
                       bg-[var(--color-accent)] text-[var(--color-bg-primary)]
                       hover:bg-[var(--color-accent-dim)]
                       transition-colors duration-200 cursor-pointer"
          >
            Crear partida
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/play')}
            className="px-8 py-4 rounded-xl font-semibold text-base
                       bg-transparent text-[var(--color-text-primary)]
                       border border-[var(--color-border-light)]
                       hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-bg-elevated)]
                       transition-all duration-200 cursor-pointer"
          >
            Unirse como jugador
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
