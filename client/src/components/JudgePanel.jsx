import { motion } from 'framer-motion';

export default function JudgePanel({ currentBuzz, onCorrect, onIncorrect }) {
  if (!currentBuzz) return null;

  return (
    <div className="space-y-4">
      {/* Player being judged */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center shadow-xs"
      >
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
          Respondiendo ahora
        </p>
        <p className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">
          {currentBuzz.playerName}
        </p>
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-2xs border bg-white"
          style={{
            borderColor: `${currentBuzz.teamColor}40`,
            color: currentBuzz.teamColor,
          }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: currentBuzz.teamColor }}
          />
          {currentBuzz.teamName}
        </div>

        {currentBuzz.elapsedSeconds !== undefined && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 bg-white/70 py-1 px-3 rounded-lg border border-slate-200/60 max-w-xs mx-auto">
            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{currentBuzz.elapsedSeconds}s de reacción</span>
            <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              +{currentBuzz.suggestedPoints || 1} pts por velocidad
            </span>
          </div>
        )}
      </motion.div>

      {/* Judge Buttons */}
      <div className="grid grid-cols-2 gap-3.5">
        <button
          onClick={onCorrect}
          className="py-4 px-4 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 active:translate-y-0.5 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>Correcto (+{currentBuzz.suggestedPoints || 1} pts)</span>
        </button>

        <button
          onClick={onIncorrect}
          className="py-4 px-4 rounded-2xl font-black text-sm bg-rose-600 hover:bg-rose-700 active:translate-y-0.5 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
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
