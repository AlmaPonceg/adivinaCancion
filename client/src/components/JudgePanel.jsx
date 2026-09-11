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

      {/* Judge Buttons — chunky arcade cabinet pushers */}
      <div className="grid grid-cols-2 gap-3.5 rounded-2xl bg-[#111827] border-2 border-slate-700/80 p-3.5 shadow-[0_14px_30px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.05)]">
        <button
          onClick={onCorrect}
          className="relative overflow-hidden py-5 px-4 rounded-2xl font-heading font-black uppercase tracking-wider text-sm text-white bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-700 border-2 border-emerald-900/80 border-b-[6px] shadow-[0_6px_16px_rgba(16,185,129,0.45),inset_0_2px_3px_rgba(255,255,255,0.45),inset_0_-4px_8px_rgba(0,0,0,0.3)] flex items-center justify-center gap-2 cursor-pointer transition-all duration-100 hover:brightness-110 active:translate-y-1 active:border-b-2 active:shadow-[0_2px_6px_rgba(16,185,129,0.4),inset_0_3px_8px_rgba(0,0,0,0.45)] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/60"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
        >
          <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
          <span className="relative rounded-full bg-black/25 p-1.5 border border-white/20">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span className="relative">Correcto (+{currentBuzz.suggestedPoints || 1} pts)</span>
        </button>

        <button
          onClick={onIncorrect}
          className="relative overflow-hidden py-5 px-4 rounded-2xl font-heading font-black uppercase tracking-wider text-sm text-white bg-gradient-to-b from-rose-400 via-rose-500 to-rose-700 border-2 border-rose-950/80 border-b-[6px] shadow-[0_6px_16px_rgba(244,63,94,0.45),inset_0_2px_3px_rgba(255,255,255,0.45),inset_0_-4px_8px_rgba(0,0,0,0.3)] flex items-center justify-center gap-2 cursor-pointer transition-all duration-100 hover:brightness-110 active:translate-y-1 active:border-b-2 active:shadow-[0_2px_6px_rgba(244,63,94,0.4),inset_0_3px_8px_rgba(0,0,0,0.45)] focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-300/60"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
        >
          <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
          <span className="relative rounded-full bg-black/25 p-1.5 border border-white/20">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
          <span className="relative">Incorrecto</span>
        </button>
      </div>
    </div>
  );
}
