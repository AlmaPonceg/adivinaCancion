import { motion } from 'framer-motion';

export default function JudgePanel({ currentBuzz, onCorrect, onIncorrect }) {
  if (!currentBuzz) return null;

  return (
    <div>
      {/* Player being judged */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-5"
      >
        <p className="label mb-2">Responde</p>
        <p className="text-xl font-bold" style={{ color: currentBuzz.teamColor }}>
          {currentBuzz.playerName}
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          {currentBuzz.teamName}
        </p>
      </motion.div>

      {/* Judge Buttons */}
      <div className="flex gap-2.5">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCorrect}
          className="flex-1 py-3.5 rounded-xl font-semibold
                     bg-[var(--color-correct)] text-[var(--color-bg-primary)]
                     hover:brightness-110
                     transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Correcto
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={onIncorrect}
          className="flex-1 py-3.5 rounded-xl font-semibold
                     bg-[var(--color-coral)] text-white
                     hover:brightness-110
                     transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Incorrecto
        </motion.button>
      </div>
    </div>
  );
}
