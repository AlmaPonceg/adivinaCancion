import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export default function Landing() {
  const navigate = useNavigate();
  const { isAlmaTheme, openLoginModal, lockTheme } = useTheme();
  const [roomCodeInput, setRoomCodeInput] = useState('');

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 text-[var(--color-text-primary)] relative">
      {/* Top Navbar */}
      <header className="w-full max-w-xl flex items-center justify-between py-3 mb-3 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#46178F] text-white flex items-center justify-center shadow-xs">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <span className="font-display font-black text-sm text-[#181226] tracking-tight">
            Adiviná la Canción
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isAlmaTheme ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-[#FF5722]/30 text-xs font-bold text-[#FF5722] shadow-xs select-none">
              <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-pulse" />
              <span>Edición Alma #24</span>
              <button
                type="button"
                onClick={lockTheme}
                className="ml-1 text-[#6B6280] hover:text-[#181226] cursor-pointer"
                title="Cerrar sesión y volver al modo estándar"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => navigate('/planes')}
                className="text-xs font-bold text-[#746B8A] hover:text-[#181226] hover:bg-black/5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                title="Planes y Suscripciones"
              >
                <svg className="w-3.5 h-3.5 text-[#746B8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Planes</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="text-xs font-bold text-[#746B8A] hover:text-[#181226] hover:bg-black/5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                title="Panel de Moderador & Estadísticas"
              >
                <svg className="w-3.5 h-3.5 text-[#746B8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span className="hidden sm:inline">Moderación</span>
              </button>

              <button
                type="button"
                onClick={openLoginModal}
                className="text-xs font-bold text-[#746B8A] hover:text-[#181226] hover:bg-black/5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-[#746B8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Iniciar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="party-card bg-white p-8 sm:p-12 rounded-[2.2rem] text-center max-w-xl w-full relative z-10 border-2 border-[#E5DFD5] shadow-xl"
      >
        {/* Vinyl Record & Turntable Centerpiece */}
        <div className="flex justify-center mb-7 relative">
          <div className="relative p-2.5 rounded-full bg-[#FAF7F2] border-2 border-[#E5DFD5] shadow-md">
            {/* Spinning Vinyl */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#181226] border-4 border-[#2A233D] shadow-xl flex items-center justify-center relative overflow-hidden"
              style={{
                backgroundImage: 'repeating-radial-gradient(#251E38 0, #251E38 2px, #181226 3px, #181226 5px)',
              }}
            >
              {/* Center Vinyl Label */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FF5722] p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-[#181226] flex flex-col items-center justify-center text-[7px] font-black uppercase text-[#FF5722] tracking-tighter">
                  <span>TRIVIA</span>
                  <span className="text-[6px] text-white">EN VIVO</span>
                </div>
              </div>
              {/* Spindle hole */}
              <div className="absolute w-2 h-2 rounded-full bg-[#181226] border border-white/50" />
            </motion.div>

            {/* Equalizer Visualizer Micro-Bars */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-end gap-1 px-3 py-1 rounded-full bg-white border border-[#E0D9CB] shadow-xs">
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
          <span className="h-px w-8 bg-[#E5DFD5]" />
          <span className="badge-tag text-[#FF5722] tracking-[0.25em] font-extrabold">
            JUEGO DE MÚSICA EN VIVO · MULTIJUGADOR
          </span>
          <span className="h-px w-8 bg-[#E5DFD5]" />
        </div>

        {/* Hero Title with Solid Color Accent */}
        <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight leading-[1.05] text-[#181226] mb-3">
          ADIVINÁ LA <span className="text-[#FF5722]">CANCIÓN</span>
        </h1>

        <p className="text-[#574F6B] text-xs sm:text-base mb-6 sm:mb-7 max-w-sm mx-auto leading-relaxed font-semibold">
          El juego de música en vivo para reuniones y fiestas. Cada invitado usa su celular como pulsador de alta velocidad.
        </p>

        {/* Feature Strip */}
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

        {/* Action Flows */}
        <div className="flex flex-col gap-3.5">
          {/* Quick PIN Join Input (Kahoot-style) */}
          <div className="p-2.5 rounded-2xl bg-[#FAF7F2] border-2 border-[#E5DFD5] flex items-center gap-2">
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase().slice(0, 4))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const code = roomCodeInput.trim().toUpperCase();
                  if (code.length === 4) navigate(`/play?code=${code}`);
                  else navigate('/play');
                }
              }}
              placeholder="PIN DE SALA (4 LETRAS)"
              className="flex-1 px-3 py-2.5 bg-white border border-[#E5DFD5] rounded-xl text-center font-display font-black text-sm tracking-widest text-[#181226] placeholder-[#8E869E] uppercase focus:outline-none focus:border-[#FF5722]"
              maxLength={4}
            />
            <button
              onClick={() => {
                const code = roomCodeInput.trim().toUpperCase();
                if (code.length === 4) navigate(`/play?code=${code}`);
                else navigate('/play');
              }}
              className="arcade-btn-lime px-5 py-2.5 rounded-xl text-xs font-black shrink-0 cursor-pointer shadow-xs"
            >
              Unirme
            </button>
          </div>

          {/* Primary Host Action: Browse Games in Library to Play */}
          <button
            onClick={() => navigate('/library')}
            className="arcade-btn-ruby py-4 px-6 rounded-2xl text-base sm:text-lg font-black uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Explorar Partidas para Jugar</span>
          </button>

          {/* Secondary Action: Create New Game (Kahoot Studio) */}
          <button
            onClick={() => navigate('/create')}
            className="arcade-btn-purple py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Crear Nueva Partida</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
