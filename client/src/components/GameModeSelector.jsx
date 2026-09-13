import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const GAME_MODES = [
  {
    id: 'auto',
    name: 'Sorteo Automático',
    shortName: 'Sorteo',
    tagline: 'Equipos equilibrados al azar por el sistema',
    badge: 'Más popular',
    color: '#4F46E5', // Indigo
    colorLight: '#EEF2FF',
    colorBorder: '#C7D2FE',
    colorText: '#3730A3',
    gradient: 'from-[#4F46E5] to-[#6366F1]',
    glowColor: 'rgba(79, 70, 229, 0.25)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    description:
      'El sistema baraja y distribuye a todos los participantes en equipos parejos de forma automática y transparente.',
    howItWorks: [
      'Los invitados se unen escaneando el código QR con la cámara de su celular.',
      'El sistema sortea y balancea los grupos según la cantidad de integrantes que elijas.',
      'Cada celular adopta el color y nombre de su equipo asignado al instante.',
    ],
    idealFor: 'Mezclar a los invitados, romper el hielo y armar partidas justas y veloces sin demoras.',
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
    shortName: 'Manual',
    tagline: 'Los jugadores eligen su equipo desde su celular',
    badge: 'Libertad total',
    color: '#FF5722', // Deep Orange
    colorLight: '#FFF7ED',
    colorBorder: '#FFEDD5',
    colorText: '#9A3412',
    gradient: 'from-[#FF5722] to-[#F97316]',
    glowColor: 'rgba(255, 87, 34, 0.25)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    description:
      'Vos creás la cantidad de equipos que quieras (2, 4, 10, etc.) y los jugadores tocan en su teléfono a qué equipo sumarse.',
    howItWorks: [
      'El anfitrión define cuántos equipos crear y si hay cupo máximo por equipo o es libre.',
      'En la pantalla del celular de cada invitado aparece el listado de equipos disponibles.',
      'Tocan "Unirme" en su equipo preferido y pueden renombrarlo a su gusto.',
    ],
    idealFor: 'Rivalidades ya armadas en la fiesta (Amigos vs Familia, Varones vs Mujeres, etc.).',
    defaultParams: {
      gameMode: 'teams',
      teamSelectionMode: 'manual',
      autoHostEnabled: false,
      maxPlayersPerTeam: 0, // Sin límite por defecto o configurable
      manualTeamsCount: 4,
    },
  },
  {
    id: 'individual',
    name: 'Individual (Todos contra todos)',
    shortName: 'Individual',
    tagline: 'Sin equipos. Cada jugador suma sus propios puntos',
    badge: 'Competencia pura',
    color: '#D946EF', // Fuchsia
    colorLight: '#FDF4FF',
    colorBorder: '#F5D0FE',
    colorText: '#86198F',
    gradient: 'from-[#D946EF] to-[#C026D3]',
    glowColor: 'rgba(217, 70, 239, 0.25)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    description:
      'Cada persona juega con su propio nombre. La TV tiene un marcador personal para cada invitado.',
    howItWorks: [
      'Cada participante tiene su pulsador individual en su teléfono.',
      'El primero en presionar gana el derecho a responder de forma personal.',
      'Los puntos se suman a la tabla de posiciones individual de cada jugador.',
    ],
    idealFor: 'Grupos pequeños o medianos donde todos quieren medirse mano a mano sin depender de nadie.',
    defaultParams: {
      gameMode: 'individual',
      teamSelectionMode: 'auto',
      autoHostEnabled: false,
      maxPlayersPerTeam: 1,
    },
  },
  {
    id: 'autohost',
    name: 'Modo "Todos Juegan" (Auto-Host)',
    shortName: 'Auto-Host',
    tagline: 'La TV conduce la trivia sola. ¡El anfitrión también juega!',
    badge: 'Sin host fijo',
    color: '#059669', // Emerald
    colorLight: '#ECFDF5',
    colorBorder: '#A7F3D0',
    colorText: '#065F46',
    gradient: 'from-[#059669] to-[#10B981]',
    glowColor: 'rgba(5, 150, 105, 0.25)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    description:
      'Conducción automatizada inteligente: reproduce música, detecta buzzers, cuenta 7 segundos y revela la canción por voz.',
    howItWorks: [
      'Nadie tiene que quedarse sentado controlando la computadora.',
      'La pantalla de la tele guía los turnos con voz sintetizada y cuenta regresiva.',
      'El host puede agarrar su propio celular y jugar a la par del resto de los invitados.',
    ],
    idealFor: 'Fiestas donde el cumpleañero y el anfitrión quieren participar activamente de la diversión.',
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
  onCancel,
  roomCode,
}) {
  // Determine initial selected mode
  const getInitialModeId = () => {
    if (initialParams.autoHostEnabled) return 'autohost';
    if (initialParams.gameMode === 'individual') return 'individual';
    if (initialParams.teamSelectionMode === 'manual') return 'manual';
    return 'auto';
  };

  const [selectedId, setSelectedId] = useState(getInitialModeId);
  const [maxPlayers, setMaxPlayers] = useState(initialParams.maxPlayersPerTeam ?? 4);
  const [manualCount, setManualCount] = useState(4);
  const [manualLimit, setManualLimit] = useState(initialParams.maxPlayersPerTeam ?? 0);

  const activeMode = GAME_MODES.find((m) => m.id === selectedId) || GAME_MODES[0];

  const handleSelect = (id) => {
    setSelectedId(id);
  };

  const handleConfirm = () => {
    let params = { ...activeMode.defaultParams };
    if (selectedId === 'auto') {
      params.maxPlayersPerTeam = maxPlayers;
    } else if (selectedId === 'manual') {
      params.manualTeamsCount = manualCount;
      params.maxPlayersPerTeam = manualLimit;
    } else if (selectedId === 'autohost') {
      params.maxPlayersPerTeam = maxPlayers;
    }
    onConfirm(params);
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-2 px-3 sm:px-6 animate-fade-in">
      {/* Header Eyebrow */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#EAE3D5] shadow-2xs mb-2.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeMode.color }} />
          <span className="text-[11px] font-black uppercase tracking-widest text-[#6B6280]">
            PASO 1 DE 2 · CONFIGURACIÓN DE SALA
          </span>
          {roomCode && (
            <span className="text-[11px] font-black text-[#181226] border-l border-[#EAE3D5] pl-2">
              SALA {roomCode}
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl sm:text-4xl font-black text-[#181226] tracking-tight">
          Elegí la Modalidad de Juego
        </h1>
        <p className="text-xs sm:text-sm text-[#6B6280] font-semibold max-w-md mx-auto mt-1">
          Seleccioná cómo van a jugar los invitados. Podés cambiar las reglas en cualquier momento.
        </p>
      </div>

      {/* 2-COLUMN GRID: Menú de Modos (Izq) vs Explicación y Configuración (Der) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* COLUMNA IZQUIERDA: Tarjetas de selección de modo (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-[#8E869E] px-1">
            Modalidades Disponibles
          </p>

          <div className="space-y-2.5">
            {GAME_MODES.map((mode) => {
              const isSelected = mode.id === selectedId;
              return (
                <motion.button
                  key={mode.id}
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleSelect(mode.id)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex items-start gap-3.5 ${
                    isSelected
                      ? 'bg-white shadow-md'
                      : 'bg-[#FAF7F2] border-[#EAE3D5] hover:border-[#D5CEBF] hover:bg-white/80'
                  }`}
                  style={{
                    borderColor: isSelected ? mode.color : undefined,
                    boxShadow: isSelected ? `0 8px 24px -4px ${mode.glowColor}` : undefined,
                  }}
                >
                  {/* Left accent bar if selected */}
                  {isSelected && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1.5"
                      style={{ backgroundColor: mode.color }}
                    />
                  )}

                  {/* Icon container */}
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

                  {/* Text content */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                      <h3 className="font-display font-black text-sm text-[#181226] truncate">
                        {mode.name}
                      </h3>
                      <span
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-md shrink-0 uppercase"
                        style={{
                          backgroundColor: mode.colorLight,
                          color: mode.colorText,
                          border: `1px solid ${mode.colorBorder}`,
                        }}
                      >
                        {mode.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B6280] font-medium line-clamp-2 leading-relaxed">
                      {mode.tagline}
                    </p>
                  </div>

                  {/* Radio selector circle */}
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 self-center transition-all"
                    style={{
                      borderColor: isSelected ? mode.color : '#D5CEBF',
                      backgroundColor: isSelected ? mode.color : 'transparent',
                    }}
                  >
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* COLUMNA DERECHA: Explicación Detallada y Configuración Previa (7 cols) */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMode.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="party-card p-6 sm:p-8 rounded-[2.2rem] bg-white border-2 shadow-xl relative overflow-hidden"
              style={{
                borderColor: activeMode.colorBorder,
              }}
            >
              {/* Top ambient color glow */}
              <div
                className="absolute -top-16 -right-16 w-52 h-52 rounded-full blur-3xl opacity-25 pointer-events-none"
                style={{ backgroundColor: activeMode.color }}
              />

              {/* Mode Header */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#EAE3D5] relative">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                    style={{ backgroundColor: activeMode.color }}
                  >
                    {activeMode.icon}
                  </span>
                  <div>
                    <span
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: activeMode.colorLight,
                        color: activeMode.colorText,
                        border: `1px solid ${activeMode.colorBorder}`,
                      }}
                    >
                      {activeMode.badge}
                    </span>
                    <h2 className="font-display text-xl sm:text-2xl font-black text-[#181226] leading-tight mt-0.5">
                      {activeMode.name}
                    </h2>
                  </div>
                </div>

                <div
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase"
                  style={{
                    backgroundColor: activeMode.colorLight,
                    color: activeMode.colorText,
                  }}
                >
                  Modo Seleccionado
                </div>
              </div>

              {/* Brief Description */}
              <p className="text-xs sm:text-sm text-[#181226] font-semibold leading-relaxed mb-5">
                {activeMode.description}
              </p>

              {/* Dynamic Feature Blocks */}
              <div className="space-y-4 mb-6">
                {/* How it works viñetas */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5]">
                  <p className="text-xs font-black text-[#181226] uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 rounded-full" style={{ backgroundColor: activeMode.color }} />
                    ¿Cómo se juega en esta modalidad?
                  </p>
                  <ul className="space-y-2">
                    {activeMode.howItWorks.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-[#574F6B] font-medium leading-normal">
                        <span
                          className="w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            backgroundColor: activeMode.colorLight,
                            color: activeMode.colorText,
                            border: `1px solid ${activeMode.colorBorder}`,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Ideal for block */}
                <div
                  className="p-3.5 rounded-2xl border flex items-center gap-3"
                  style={{
                    backgroundColor: activeMode.colorLight,
                    borderColor: activeMode.colorBorder,
                  }}
                >
                  <span
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 text-xs font-black"
                    style={{ backgroundColor: activeMode.color }}
                  >
                    OK
                  </span>
                  <div className="text-xs leading-snug">
                    <strong className="font-black text-[#181226]">Recomendado para: </strong>
                    <span className="text-[#4B435C] font-medium">{activeMode.idealFor}</span>
                  </div>
                </div>

                {/* Quick Parameters Configuration depending on mode */}
                {selectedId === 'auto' && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <p className="text-xs font-black text-[#181226]">Integrantes por equipo:</p>
                      <p className="text-[11px] text-[#6B6280]">
                        Se armarán grupos balanceados de hasta {maxPlayers} personas
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {[2, 3, 4, 5, 6, 8, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setMaxPlayers(num)}
                          className={`w-7 h-7 rounded-lg text-xs font-black cursor-pointer transition-all ${
                            maxPlayers === num
                              ? 'text-white shadow-2xs font-black'
                              : 'bg-white text-[#6B6280] border border-[#EAE3D5] hover:text-[#181226]'
                          }`}
                          style={{
                            backgroundColor: maxPlayers === num ? activeMode.color : undefined,
                          }}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedId === 'manual' && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-black text-[#181226]">Equipos iniciales:</p>
                        <p className="text-[11px] text-[#6B6280]">Habilitar {manualCount} equipos en la sala</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {[2, 3, 4, 6, 8, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setManualCount(num)}
                            className={`px-2 py-0.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                              manualCount === num
                                ? 'text-white shadow-2xs'
                                : 'bg-white text-[#6B6280] border border-[#EAE3D5] hover:text-[#181226]'
                            }`}
                            style={{
                              backgroundColor: manualCount === num ? activeMode.color : undefined,
                            }}
                          >
                            {num} eq.
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Confirm & Enter Room */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="arcade-btn py-3.5 px-5 rounded-2xl text-xs font-bold text-[#6B6280] hover:text-[#181226] cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 py-4 px-6 rounded-2xl text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg cursor-pointer transition-all active:scale-98"
                  style={{
                    backgroundColor: activeMode.color,
                    boxShadow: `0 10px 24px -4px ${activeMode.glowColor}`,
                  }}
                >
                  <span>Continuar a la Sala con {activeMode.shortName}</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
