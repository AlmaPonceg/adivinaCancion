import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const GAME_MODES = [
  {
    id: 'auto',
    name: 'Equipos al Azar',
    shortName: 'Equipos al Azar',
    num: '01',
    subtitle: 'El juego reparte los grupos automáticamente',
    color: '#4F46E5',
    colorDark: '#312E81',
    colorLight: '#EEF2FF',
    colorBorder: '#C7D2FE',
    colorText: '#3730A3',
    description:
      'El sistema distribuye a los invitados en equipos parejos a medida que escanean el código QR. Es la opción más rápida para arrancar a jugar.',
    defaultParams: {
      gameMode: 'teams',
      teamSelectionMode: 'auto',
      autoHostEnabled: false,
      maxPlayersPerTeam: 4,
    },
  },
  {
    id: 'manual',
    name: 'Elección de Equipos',
    shortName: 'Elección Libre',
    num: '02',
    subtitle: 'Cada invitado elige su bando desde el celular',
    color: '#FF5722',
    colorDark: '#9A3412',
    colorLight: '#FFF7ED',
    colorBorder: '#FFEDD5',
    colorText: '#9A3412',
    description:
      'Habilitá los equipos que quieras y cada participante elige a cuál sumarse desde su teléfono. Ideal para armar rivalidades clásicas en la fiesta.',
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
    num: '03',
    subtitle: 'Sin equipos, cada uno suma sus propios puntos',
    color: '#D946EF',
    colorDark: '#86198F',
    colorLight: '#FDF4FF',
    colorBorder: '#F5D0FE',
    colorText: '#86198F',
    description:
      'Cada persona juega por su cuenta con su propio pulsador. Al terminar cada canción, la pantalla muestra el ranking con las posiciones individuales.',
    defaultParams: {
      gameMode: 'individual',
      teamSelectionMode: 'auto',
      autoHostEnabled: false,
      maxPlayersPerTeam: 1,
    },
  },
  {
    id: 'autohost',
    name: 'Modo Auto-Host (Todos Juegan)',
    shortName: 'Auto-Host',
    num: '04',
    subtitle: 'La TV conduce la trivia sin spoilers para nadie',
    color: '#059669',
    colorDark: '#065F46',
    colorLight: '#ECFDF5',
    colorBorder: '#A7F3D0',
    colorText: '#065F46',
    description:
      'La pantalla maneja sola las cuentas regresivas y la sala valida los aciertos. Así el anfitrión también puede agarrar su celu y jugar como uno más.',
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
    <div className="w-full max-w-xl mx-auto bg-[#FFFFFF] rounded-3xl border-2 border-[#DDD5C5] shadow-xl overflow-hidden flex flex-col">
      {/* ── Header Bar ─────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-[#EAE3D5] bg-[#F7F4EE] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="arcade-btn px-3 py-1.5 rounded-xl text-xs font-bold text-[#181226] hover:text-[#FF5722] flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full transition-colors duration-200 shrink-0"
              style={{ backgroundColor: activeMode.color }}
            />
            <h1 className="font-display font-black text-sm sm:text-base text-[#181226] tracking-tight">
              Elegí cómo jugar
            </h1>
          </div>
        </div>

        {roomCode && (
          <span className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD5C5] font-mono text-[11px] font-black text-[#181226] shadow-2xs">
            SALA {roomCode}
          </span>
        )}
      </div>

      {/* ── Options Stack (Centered, One Below the Other) ────── */}
      <div className="p-4 sm:p-5 flex flex-col gap-2.5">
        {GAME_MODES.map((mode) => {
          const isSelected = mode.id === selectedId;

          return (
            <div
              key={mode.id}
              onClick={() => setSelectedId(mode.id)}
              className={`w-full rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                isSelected
                  ? 'border-current bg-white shadow-sm'
                  : 'border-[#EAE3D5] bg-[#FAF7F2] hover:border-[#DDD5C5] hover:bg-white'
              }`}
              style={{
                borderColor: isSelected ? mode.color : '#EAE3D5',
              }}
            >
              {/* Option Header Row */}
              <div className="p-3.5 flex items-center gap-3.5">
                {/* Mode Number Stamp */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-sm shrink-0 transition-colors"
                  style={{
                    backgroundColor: isSelected ? mode.color : '#EDE8DF',
                    color: isSelected ? '#FFFFFF' : '#6B6280',
                  }}
                >
                  {mode.num}
                </div>

                {/* Title & Subtitle */}
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-[15px] sm:text-base text-[#181226] leading-tight tracking-tight">
                    {mode.name}
                  </h2>
                  <p className="text-[12px] text-[#6B6280] font-medium leading-tight mt-0.5">
                    {mode.subtitle}
                  </p>
                </div>

                {/* Accordion Indicator */}
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all"
                  style={{
                    backgroundColor: isSelected ? mode.color : '#F1ECE3',
                    color: isSelected ? '#FFFFFF' : '#8A8199',
                  }}
                >
                  {isSelected ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Expandable Brief Description & 3D Arcade Button */}
              <AnimatePresence initial={false}>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-3.5 pb-3.5 pt-1 flex flex-col gap-3">
                      {/* Short, natural explanation in a warm inset well */}
                      <p className="text-xs text-[#2A233C] font-semibold leading-relaxed bg-[#F7F4EE] p-3 rounded-xl border border-[#DDD5C5]">
                        {mode.description}
                      </p>

                      {/* 3D Physical Arcade Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirm(mode);
                        }}
                        className="w-full py-3 px-4 rounded-xl text-white font-tactical font-black text-sm flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-0.5"
                        style={{
                          backgroundColor: mode.color,
                          boxShadow: `0 4px 0 ${mode.colorDark}`,
                        }}
                      >
                        <span>Entrar a la Sala con {mode.shortName}</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
