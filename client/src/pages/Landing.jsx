import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export default function Landing() {
  const navigate = useNavigate();
  const { isAlmaTheme, openUnlockModal, lockTheme } = useTheme();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 text-[var(--color-text-primary)] relative overflow-hidden">
      {/* Sunlit Festival Ambient Glows */}
      <div className="absolute top-[-10%] left-[20%] w-96 h-96 bg-[#FF5722]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[20%] w-96 h-96 bg-[#F59E0B]/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-80 h-80 bg-[#E11D48]/08 rounded-full blur-3xl pointer-events-none" />

      {/* Memory Mode Active Banner */}
      {isAlmaTheme && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-xs border border-[#FF5722]/30 text-xs font-bold text-[#FF5722] shadow-sm z-20 select-none"
        >
          <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-pulse" />
          <span>Edición Cumpleaños Alma #24 activa</span>
          <button
            type="button"
            onClick={lockTheme}
            className="ml-1 underline text-[#6B6280] hover:text-[#181226] cursor-pointer"
            title="Volver a la versión neutral para el público general"
          >
            (Salir)
          </button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="party-card party-card-glow p-8 sm:p-12 rounded-[2.2rem] text-center max-w-xl w-full relative z-10"
      >
        {/* Vinyl Record & Turntable Centerpiece */}
        <div className="flex justify-center mb-7 relative">
          <div className="relative p-2.5 rounded-full bg-[#FAF7F2] border-2 border-[#E5DFD5] shadow-xl">
            {/* Spinning Vinyl */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#181226] border-4 border-[#2A233D] shadow-2xl flex items-center justify-center relative overflow-hidden"
              style={{
                backgroundImage: 'repeating-radial-gradient(#251E38 0, #251E38 2px, #181226 3px, #181226 5px)',
              }}
            >
              {/* Center Vinyl Label */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#FF5722] via-[#E11D48] to-[#F59E0B] p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-[#FAF7F2] flex flex-col items-center justify-center text-[7px] font-black uppercase text-[#FF5722] tracking-tighter">
                  <span>TRIVIA</span>
                  <span className="text-[6px] text-[#181226]">EN VIVO</span>
                </div>
              </div>
              {/* Spindle hole */}
              <div className="absolute w-2 h-2 rounded-full bg-[#181226] border border-white/50" />
            </motion.div>

            {/* Equalizer Visualizer Micro-Bars */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-end gap-1 px-3 py-1 rounded-full bg-white border border-[#E0D9CB] shadow-md">
              <span className="w-1.5 bg-[#FF5722] rounded-full eq-bar-1" />
              <span className="w-1.5 bg-[#E11D48] rounded-full eq-bar-2" />
              <span className="w-1.5 bg-[#059669] rounded-full eq-bar-3" />
              <span className="w-1.5 bg-[#D97706] rounded-full eq-bar-4" />
              <span className="w-1.5 bg-[#0284C7] rounded-full eq-bar-2" />
            </div>
          </div>
        </div>

        {/* Eyebrow Header */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="h-0.5 w-8 bg-gradient-to-r from-transparent via-[#FF5722]/60 to-[#E11D48]/80" />
          <span className="badge-tag text-[#FF5722] tracking-[0.25em] font-extrabold">
            JUEGO DE MÚSICA EN VIVO · MULTIJUGADOR
          </span>
          <span className="h-0.5 w-8 bg-gradient-to-l from-transparent via-[#FF5722]/60 to-[#E11D48]/80" />
        </div>

        {/* Hero Title */}
        <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight leading-[1.05] text-[#181226] mb-3">
          ADIVINÁ LA{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5722] via-[#E11D48] to-[#D97706]">
            CANCIÓN
          </span>
        </h1>

        <p className="text-[#574F6B] text-xs sm:text-base mb-6 sm:mb-7 max-w-sm mx-auto leading-relaxed font-semibold">
          El juego de música en vivo para reuniones y fiestas. Cada invitado usa su celular como pulsador de alta velocidad.
        </p>

        {/* Feature Strip (Daytime Festival Pass) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mb-6 sm:mb-8 text-left">
          <div className="p-2.5 sm:p-3.5 rounded-2xl bg-[#F7F4EE] border border-[#E5DFD5] flex flex-col justify-between shadow-xs">
            <span className="text-[#FF5722] text-lg sm:text-xl font-black leading-none mb-1">01</span>
            <span className="text-[10px] sm:text-[11px] font-extrabold text-[#181226] leading-snug">Pulsador Celular</span>
          </div>
          <div className="p-2.5 sm:p-3.5 rounded-2xl bg-[#F7F4EE] border border-[#E5DFD5] flex flex-col justify-between shadow-xs">
            <span className="text-[#E11D48] text-lg sm:text-xl font-black leading-none mb-1">02</span>
            <span className="text-[10px] sm:text-[11px] font-extrabold text-[#181226] leading-snug">Equipos en Vivo</span>
          </div>
          <div className="p-2.5 sm:p-3.5 rounded-2xl bg-[#F7F4EE] border border-[#E5DFD5] flex flex-col justify-between shadow-xs">
            <span className="text-[#059669] text-lg sm:text-xl font-black leading-none mb-1">03</span>
            <span className="text-[10px] sm:text-[11px] font-extrabold text-[#181226] leading-snug">Podio en Vivo</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3.5">
          <button
            onClick={() => navigate('/host')}
            className="arcade-btn-primary py-4 px-6 rounded-2xl text-base font-black flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Crear Sala (Host en Celu o TV)</span>
          </button>

          <button
            onClick={() => navigate('/play')}
            className="arcade-btn py-4 px-6 rounded-2xl text-base font-black text-[#181226] flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="w-5 h-5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Unirme como Jugador con Celular</span>
          </button>
        </div>
      </motion.div>

      {/* Subtle Memory Mode Unlock Trigger in Footer */}
      {!isAlmaTheme && (
        <button
          type="button"
          onClick={openUnlockModal}
          className="mt-6 inline-flex items-center gap-1.5 text-xs text-[#8E869E] hover:text-[#181226] transition-colors cursor-pointer py-1.5 px-3 rounded-xl hover:bg-white/60 z-20 select-none"
          title="Acceso para anfitriones a la edición privada de cumpleaños"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Acceso Especial / Modo Recuerdo</span>
        </button>
      )}
    </div>
  );
}
