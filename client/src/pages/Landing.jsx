import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 bg-[var(--color-console-bg)] text-[var(--color-text-on-dark)]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="console-card p-8 sm:p-12 rounded-3xl text-center max-w-lg w-full relative overflow-hidden"
      >
        {/* Ambient background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Celebratory Icon / Animated Vinyl */}
        <div className="flex justify-center mb-6 relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            className="w-20 h-20 rounded-full bg-slate-950 border-4 border-slate-700 shadow-xl flex items-center justify-center relative"
          >
            {/* Vinyl grooves */}
            <div className="w-14 h-14 rounded-full border border-slate-800 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border border-slate-700/80 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 shadow-inner" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Edition Subtitle / Eyebrow */}
        <div className="flex items-center justify-center gap-3 mb-2.5">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-indigo-500/60" />
          <span className="text-xs font-black uppercase tracking-[0.25em] text-indigo-400">
            Edición Cumpleaños
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-indigo-500/60" />
        </div>

        {/* Title */}
        <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight leading-none text-slate-100 mb-3">
          Trivia <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-indigo)] via-purple-400 to-[var(--color-neon-pink)]">Musical</span>
        </h1>

        <p className="text-slate-400 text-sm sm:text-base mb-8 max-w-xs sm:max-w-sm mx-auto leading-relaxed">
          Adiviná la canción antes que los demás. En tiempo real, con pulsador táctil en el celular de cada invitado.
        </p>

        {/* Feature Tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <span className="text-[11px] font-bold text-slate-300 bg-[#0B0F19] border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--color-neon-indigo)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Tiempo Real
          </span>
          <span className="text-[11px] font-bold text-slate-300 bg-[#0B0F19] border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--color-neon-indigo)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Pulsador en Celulares
          </span>
          <span className="text-[11px] font-bold text-slate-300 bg-[#0B0F19] border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--color-neon-indigo)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Equipos en Vivo
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3.5">
          <button
            onClick={() => navigate('/host')}
            className="console-btn-primary py-4 px-6 rounded-2xl text-base font-extrabold flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Crear Sala (Host / Anfitrión)
          </button>

          <button
            onClick={() => navigate('/play')}
            className="console-btn py-4 px-6 rounded-2xl text-base font-bold text-slate-100 flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-5 h-5 text-[var(--color-neon-indigo)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Unirse como Jugador
          </button>
        </div>
      </motion.div>
    </div>
  );
}
