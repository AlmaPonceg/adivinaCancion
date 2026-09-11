import { motion } from 'framer-motion';

export default function JudgePanel({ currentBuzz, onCorrect, onIncorrect }) {
  if (!currentBuzz) return null;

  return (
    <div className="space-y-4">
      {/* Player being judged */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-[2rem] bg-white border border-[#EAE3D5] text-center shadow-lg relative overflow-hidden"
        style={{
          borderTop: `4px solid ${currentBuzz.teamColor || '#FF5722'}`,
        }}
      >
        <p className="badge-tag text-[#FF5722] mb-1">
          RESPONDIENDO EN VIVO
        </p>
        <h3 className="font-display text-3xl sm:text-4xl font-black text-[#181226] tracking-tight mb-2">
          {currentBuzz.playerName}
        </h3>
        {currentBuzz.teamName && (
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] shadow-2xs"
            style={{
              borderLeft: `4px solid ${currentBuzz.teamColor || '#FF5722'}`,
            }}
          >
            <span className="font-tactical text-[10px] font-black uppercase tracking-wider text-[#6B6280]">
              Equipo
            </span>
            <span
              className="text-xs font-black tracking-wide"
              style={{ color: currentBuzz.teamColor || '#FF5722' }}
            >
              {currentBuzz.teamName}
            </span>
          </div>
        )}

        {currentBuzz.elapsedSeconds !== undefined && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-[#181226] bg-[#FAF7F2] py-1.5 px-3.5 rounded-xl border border-[#EAE3D5] max-w-xs mx-auto shadow-2xs">
            <svg className="w-3.5 h-3.5 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="mono">{currentBuzz.elapsedSeconds}s de reacción</span>
            <span className="text-[#059669] font-extrabold bg-[#E6F9F0] px-2 py-0.5 rounded border border-[#059669]/40">
              +{currentBuzz.suggestedPoints || 1} pts
            </span>
          </div>
        )}
      </motion.div>

      {/* Judge Buttons — chunky arcade cabinet pushers */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 rounded-2xl bg-[#FAF7F2] border-2 border-[#EAE3D5] p-2.5 sm:p-3.5 shadow-sm">
        <button
          onClick={onCorrect}
          className="relative overflow-hidden py-3.5 sm:py-5 px-2 sm:px-4 rounded-xl sm:rounded-2xl font-tactical font-black uppercase tracking-wider text-xs sm:text-sm text-white bg-gradient-to-b from-[#059669] via-[#047857] to-[#065F46] border-2 border-[#064E3B] border-b-[5px] sm:border-b-[6px] shadow-[0_6px_16px_rgba(5,150,105,0.35),inset_0_2px_3px_rgba(255,255,255,0.45),inset_0_-4px_8px_rgba(0,0,0,0.3)] flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all duration-100 hover:brightness-110 active:translate-y-1 active:border-b-2 active:shadow-[0_2px_6px_rgba(5,150,105,0.3),inset_0_3px_8px_rgba(0,0,0,0.45)] focus:outline-none"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}
        >
          <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
          <span className="relative rounded-full bg-black/20 p-1 sm:p-1.5 border border-white/20 shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span className="relative truncate">Correcto (+{currentBuzz.suggestedPoints || 1})</span>
        </button>

        <button
          onClick={onIncorrect}
          className="relative overflow-hidden py-3.5 sm:py-5 px-2 sm:px-4 rounded-xl sm:rounded-2xl font-tactical font-black uppercase tracking-wider text-xs sm:text-sm text-white bg-gradient-to-b from-[#E11D48] via-[#BE123C] to-[#9F1239] border-2 border-[#881337] border-b-[5px] sm:border-b-[6px] shadow-[0_6px_16px_rgba(225,29,72,0.35),inset_0_2px_3px_rgba(255,255,255,0.45),inset_0_-4px_8px_rgba(0,0,0,0.3)] flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all duration-100 hover:brightness-110 active:translate-y-1 active:border-b-2 active:shadow-[0_2px_6px_rgba(225,29,72,0.3),inset_0_3px_8px_rgba(0,0,0,0.45)] focus:outline-none"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}
        >
          <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
          <span className="relative rounded-full bg-black/20 p-1 sm:p-1.5 border border-white/20 shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
          <span className="relative truncate">Incorrecto</span>
        </button>
      </div>
    </div>
  );
}
