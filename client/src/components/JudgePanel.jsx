import { motion } from 'framer-motion';

export default function JudgePanel({ currentBuzz, onCorrect, onIncorrect }) {
  if (!currentBuzz) return null;

  return (
    <div className="space-y-4">
      {/* Player being judged well */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="nm-inset p-4 rounded-xl text-center"
      >
        <p className="label mb-1">Respondiendo ahora</p>
        <p className="text-2xl font-extrabold" style={{ color: currentBuzz.teamColor }}>
          {currentBuzz.playerName}
        </p>
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] mt-0.5">
          {currentBuzz.teamName}
        </p>
      </motion.div>

      {/* Judge Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCorrect}
          className="nm-btn py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 text-white flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>Correcto (+1)</span>
        </button>

        <button
          onClick={onIncorrect}
          className="nm-btn py-3.5 px-4 rounded-xl font-bold text-sm bg-rose-600 text-white flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Incorrecto</span>
        </button>
      </div>
    </div>
  );
}
