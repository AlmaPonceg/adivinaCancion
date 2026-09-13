import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const GAME_MODES = [
  {
    id: 'auto',
    name: 'Sorteo Automático',
    shortName: 'Sorteo Automático',
    tagline: 'Equipos equilibrados al azar por el sistema',
    badge: 'Más popular',
    color: '#4F46E5', // Electric Indigo
    colorLight: '#EEF2FF',
    colorBorder: '#C7D2FE',
    colorText: '#3730A3',
    gradient: 'from-[#4F46E5] to-[#6366F1]',
    glowColor: 'rgba(79, 70, 229, 0.28)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    description:
      'El sistema sortea y reparte a todos los participantes en equipos equilibrados automáticamente al escanear el QR.',
    defaultParams: {
      gameMode: 'teams',
      teamSelectionMode: 'auto',
      autoHostEnabled: false,
      maxPlayersPerTeam: 4,
    },
  },
  {
    id: 'manual',
    name: 'Elección Manual',
    shortName: 'Elección Manual',
    tagline: 'Los jugadores eligen su propio bando',
    badge: 'Libertad total',
    color: '#FF5722', // Sunset Coral
    colorLight: '#FFF7ED',
    colorBorder: '#FFEDD5',
    colorText: '#9A3412',
    gradient: 'from-[#FF5722] to-[#F97316]',
    glowColor: 'rgba(255, 87, 34, 0.28)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    description:
      'Habilitá los grupos que quieras y permití que cada invitado elija a qué equipo unirse desde su celular.',
    defaultParams: {
      gameMode: 'teams',
      teamSelectionMode: 'manual',
      autoHostEnabled: false,
      maxPlayersPerTeam: 0,
      manualTeamsCount: 4,
    },
  },
  {
    id: 'individual',
    name: 'Individual (Todos contra Todos)',
    shortName: 'Individual',
    tagline: 'Sin equipos, ranking personal de puntajes',
    badge: 'Competencia pura',
    color: '#D946EF', // Neon Fuchsia
    colorLight: '#FDF4FF',
    colorBorder: '#F5D0FE',
    colorText: '#86198F',
    gradient: 'from-[#D946EF] to-[#C026D3]',
    glowColor: 'rgba(217, 70, 239, 0.28)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    description:
      'Sin equipos. Cada persona juega en solitario desde su celular y suma puntos para su ranking personal.',
    defaultParams: {
      gameMode: 'individual',
      teamSelectionMode: 'auto',
      autoHostEnabled: false,
      maxPlayersPerTeam: 1,
    },
  },
  {
    id: 'autohost',
    name: 'Todos Juegan (Auto-Host)',
    shortName: 'Auto-Host',
    tagline: 'Trivia automática sin conductor fijo',
    badge: 'Sin árbitro',
    color: '#059669', // Emerald
    colorLight: '#ECFDF5',
    colorBorder: '#A7F3D0',
    colorText: '#065F46',
    gradient: 'from-[#059669] to-[#10B981]',
    glowColor: 'rgba(5, 150, 105, 0.28)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    description:
      'La pantalla conduce la trivia con tiempos automáticos y veredicto de la sala, sin spoilers para nadie.',
    defaultParams: {
      gameMode: 'teams',
      teamSelectionMode: 'auto',
      autoHostEnabled: true,
      maxPlayersPerTeam: 4,
    },
  },
];

export default function GameModeSelector({
  initialParams = {},
  onConfirm,
  onBack,
  roomCode,
}) {
  const getInitialModeId = () => {
    if (initialParams.autoHostEnabled) return 'autohost';
    if (initialParams.gameMode === 'individual') return 'individual';
    if (initialParams.teamSelectionMode === 'manual') return 'manual';
    return 'auto';
  };

  const [selectedId, setSelectedId] = useState(getInitialModeId);
  const activeMode = GAME_MODES.find((m) => m.id === selectedId) || GAME_MODES[0];

  const handleConfirm = (mode) => {
    onConfirm({ ...(mode || activeMode).defaultParams });
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl border-2 border-[#EAE3D5] shadow-2xl overflow-hidden flex flex-col">
      {/* ── Header Bar ────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-[#EAE3D5] bg-[#FAF7F2]/85 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 rounded-xl border border-[#EAE3D5] bg-white text-xs font-bold text-[#6B6280] hover:text-[#FF5722] hover:border-[#FF5722]/40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full transition-colors duration-300 shrink-0"
              style={{ backgroundColor: activeMode.color }}
            />
            <h1 className="font-display font-black text-sm sm:text-base text-[#181226] tracking-tight whitespace-nowrap">
              Elegí la Modalidad de Juego
            </h1>
          </div>
        </div>

        {roomCode && (
          <span className="px-2.5 py-1 rounded-lg bg-white border border-[#EAE3D5] text-[11px] font-black text-[#181226] shadow-2xs shrink-0">
            SALA {roomCode}
          </span>
        )}
      </div>

      {/* ── Vertical Options Stack (Centered, One Below the Other) ───── */}
      <div className="p-4 sm:p-5 flex flex-col gap-2.5">
        {GAME_MODES.map((mode) => {
          const isSelected = mode.id === selectedId;

          return (
            <motion.div
              key={mode.id}
              layout
              transition={{ layout: { duration: 0.2, ease: 'easeOut' } }}
              onClick={() => setSelectedId(mode.id)}
              className={`w-full rounded-2xl border-2 transition-colors cursor-pointer overflow-hidden ${
                isSelected
                  ? 'shadow-sm'
                  : 'bg-[#FAF7F2] border-[#EAE3D5] hover:bg-white hover:border-[#DDD5C5]'
              }`}
              style={{
                backgroundColor: isSelected ? mode.colorLight : undefined,
                borderColor: isSelected ? mode.color : '#EAE3D5',
              }}
            >
              {/* Option Header Row */}
              <div className="p-3.5 flex items-center gap-3">
                {/* Mode Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-colors"
                  style={{
                    backgroundColor: isSelected ? mode.color : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : mode.color,
                    border: isSelected ? 'none' : `1px solid ${mode.colorBorder}`,
                  }}
                >
                  {mode.icon}
                </div>

                {/* Title & Badge */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display font-black text-sm sm:text-base text-[#181226] leading-tight">
                      {mode.name}
                    </h2>
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0"
                      style={{
                        backgroundColor: isSelected ? '#FFFFFF' : mode.colorLight,
                        color: mode.colorText,
                        border: `1px solid ${mode.colorBorder}`,
                      }}
                    >
                      {mode.badge}
                    </span>
                  </div>
                  {!isSelected && (
                    <p className="text-[11px] text-[#6B6280] font-medium leading-tight mt-0.5">
                      {mode.tagline}
                    </p>
                  )}
                </div>

                {/* Radio selection circle */}
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    borderColor: isSelected ? mode.color : '#D1C9D9',
                    backgroundColor: isSelected ? mode.color : 'transparent',
                  }}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white shadow-2xs" />}
                </div>
              </div>

              {/* Expandable Brief Description & Action Button */}
              <AnimatePresence initial={false}>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-3.5 pb-3.5 pt-0.5 flex flex-col gap-2.5">
                      {/* Concise description */}
                      <p className="text-xs text-[#2A233C] font-semibold leading-relaxed bg-white/85 p-2.5 rounded-xl border border-[#EAE3D5]">
                        {mode.description}
                      </p>

                      {/* Confirm Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirm(mode);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer hover:brightness-105 active:scale-[0.99]"
                        style={{
                          backgroundColor: mode.color,
                          boxShadow: `0 4px 14px -2px ${mode.glowColor}`,
                        }}
                      >
                        <span>Continuar con {mode.shortName}</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
