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
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    description:
      'El sistema baraja y distribuye a todos los participantes en equipos parejos de forma automática y transparente al escanear el código QR.',
    features: [
      {
        title: 'Balanceo inteligente',
        desc: 'Distribución equilibrada según los cupos que definas en la sala.',
      },
      {
        title: 'Identidad automática',
        desc: 'Cada celular adopta el color y nombre de su equipo asignado.',
      },
      {
        title: 'Arranque veloz',
        desc: 'La forma más rápida de empezar a jugar sin discusiones ni demoras.',
      },
    ],
    idealFor: 'Mezclar a los invitados, romper el hielo y armar partidas justas y dinámicas.',
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
    tagline: 'Los jugadores eligen su bando desde su celular',
    badge: 'Libertad total',
    color: '#FF5722', // Sunset Coral
    colorLight: '#FFF7ED',
    colorBorder: '#FFEDD5',
    colorText: '#9A3412',
    gradient: 'from-[#FF5722] to-[#F97316]',
    glowColor: 'rgba(255, 87, 34, 0.28)',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    description:
      'Habilitá la cantidad de grupos que quieras y permití que cada invitado elija a qué equipo unirse directamente desde su teléfono.',
    features: [
      {
        title: 'Elección desde el móvil',
        desc: 'Cada invitado ve los equipos disponibles y toca Unirme en su preferido.',
      },
      {
        title: 'Bautismo de equipos',
        desc: 'Los participantes pueden renombrar y personalizar el apodo de su grupo.',
      },
      {
        title: 'Cupos flexibles',
        desc: 'Configurá límites de integrantes o dejá que los grupos se armen libremente.',
      },
    ],
    idealFor: 'Rivalidades clásicas de fiesta (Familia vs Amigos, Varones vs Mujeres, Mesas rivales).',
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
    tagline: 'Sin equipos. Cada jugador suma sus propios puntos',
    badge: 'Competencia pura',
    color: '#D946EF', // Neon Fuchsia
    colorLight: '#FDF4FF',
    colorBorder: '#F5D0FE',
    colorText: '#86198F',
    gradient: 'from-[#D946EF] to-[#C026D3]',
    glowColor: 'rgba(217, 70, 239, 0.28)',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    description:
      'Cada persona compite con su propio nombre. La pantalla de la televisión exhibe un ranking personal para cada participante.',
    features: [
      {
        title: 'Pulsador personal',
        desc: 'Cada celular es un pulsador exclusivo e individual para un único participante.',
      },
      {
        title: 'Ranking individual',
        desc: 'La pantalla muestra la tabla de posiciones con los puntajes de cada jugador.',
      },
      {
        title: 'Mano a mano directo',
        desc: 'Quien primero presiona responde y se lleva la puntuación de la ronda.',
      },
    ],
    idealFor: 'Grupos pequeños o medianos donde todos quieren medirse cara a cara sin depender de nadie.',
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
    badge: 'Sin árbitro fijo',
    color: '#059669', // Emerald
    colorLight: '#ECFDF5',
    colorBorder: '#A7F3D0',
    colorText: '#065F46',
    gradient: 'from-[#059669] to-[#10B981]',
    glowColor: 'rgba(5, 150, 105, 0.28)',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    description:
      'Conducción automatizada sin spoilers: la pantalla reproduce las canciones, maneja los turnos con cuenta regresiva y el veredicto lo decide la sala.',
    features: [
      {
        title: 'Cero spoilers en pantalla',
        desc: 'La canción permanece oculta en la TV para que nadie sepa la solución de antemano.',
      },
      {
        title: 'Veredicto de la sala',
        desc: 'El participante canta o arriesga el título y la sala valida si acierta o pifia.',
      },
      {
        title: 'El host también juega',
        desc: 'El dueño de casa participa desde su celular en igualdad de condiciones.',
      },
    ],
    idealFor: 'Fiestas donde absolutamente todos quieren agarrar el celular y jugar sin quedar como árbitro.',
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
  const getInitialModeId = () => {
    if (initialParams.autoHostEnabled) return 'autohost';
    if (initialParams.gameMode === 'individual') return 'individual';
    if (initialParams.teamSelectionMode === 'manual') return 'manual';
    return 'auto';
  };

  const [selectedId, setSelectedId] = useState(getInitialModeId);
  const activeMode = GAME_MODES.find((m) => m.id === selectedId) || GAME_MODES[0];

  const handleSelect = (id) => {
    setSelectedId(id);
  };

  const handleConfirm = () => {
    onConfirm({ ...activeMode.defaultParams });
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-2 px-3 sm:px-6 animate-fade-in">
      {/* Header Eyebrow */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#EAE3D5] shadow-2xs mb-2.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeMode.color }} />
          <span className="text-[11px] font-black uppercase tracking-widest text-[#6B6280]">
            MODALIDAD DE PARTIDA
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
          Seleccioná cómo van a competir los invitados hoy. Podés cambiarla en cualquier momento.
        </p>
      </div>

      {/* 2-Column Responsive Layout: Mode Buttons (Left) vs Arena Showcase (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* Left Column: 4 Mode Cards */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#8E869E]">
              Opciones de Juego
            </p>
            <span className="text-[10px] font-bold text-[#8E869E]">
              Tocá para previsualizar
            </span>
          </div>

          <div className="flex flex-col gap-3 flex-1 justify-between">
            {GAME_MODES.map((mode) => {
              const isSelected = mode.id === selectedId;
              return (
                <motion.button
                  key={mode.id}
                  type="button"
                  whileHover={{ scale: 1.012 }}
                  whileTap={{ scale: 0.988 }}
                  onClick={() => handleSelect(mode.id)}
                  className={`w-full text-left p-4 sm:p-4.5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex items-center gap-3.5 ${
                    isSelected
                      ? 'shadow-lg ring-2'
                      : 'bg-white border-[#EAE3D5] hover:border-[#D5CEBF] hover:shadow-xs'
                  }`}
                  style={{
                    backgroundColor: isSelected ? mode.colorLight : '#FFFFFF',
                    borderColor: isSelected ? mode.color : '#EAE3D5',
                    boxShadow: isSelected ? `0 12px 28px -6px ${mode.glowColor}` : undefined,
                  }}
                >
                  {/* Left accent color bar */}
                  {isSelected && (
                    <motion.div
                      layoutId="active-mode-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1.5"
                      style={{ backgroundColor: mode.color }}
                    />
                  )}

                  {/* Icon badge */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-all"
                    style={{
                      backgroundColor: isSelected ? mode.color : '#FAF7F2',
                      color: isSelected ? '#FFFFFF' : mode.color,
                      border: isSelected ? 'none' : `1px solid ${mode.colorBorder}`,
                    }}
                  >
                    {mode.icon}
                  </div>

                  {/* Text Details without truncation */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-display font-black text-sm text-[#181226] leading-snug">
                        {mode.name}
                      </h3>
                    </div>
                    <p className="text-[11px] text-[#6B6280] font-medium leading-tight">
                      {mode.tagline}
                    </p>
                  </div>

                  {/* Status Indicator Pill */}
                  {isSelected ? (
                    <div
                      className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-2xs"
                      style={{
                        backgroundColor: '#FFFFFF',
                        color: mode.color,
                        border: `1.5px solid ${mode.color}`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: mode.color }} />
                      <span>Elegido</span>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[#B4ACBF] shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Arena Showcase Card */}
        <div className="lg:col-span-7 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMode.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="party-card p-6 sm:p-8 rounded-[2.2rem] bg-white border-2 shadow-xl relative overflow-hidden flex-1 flex flex-col justify-between"
              style={{
                borderColor: activeMode.colorBorder,
              }}
            >
              {/* Ambient Glow */}
              <div
                className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-25 pointer-events-none"
                style={{ backgroundColor: activeMode.color }}
              />

              <div>
                {/* Mode Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EAE3D5] relative">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className="w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                      style={{ backgroundColor: activeMode.color }}
                    >
                      {activeMode.icon}
                    </span>
                    <div>
                      <span
                        className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md inline-block"
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
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase shrink-0"
                    style={{
                      backgroundColor: activeMode.colorLight,
                      color: activeMode.colorText,
                    }}
                  >
                    Modo Activo
                  </div>
                </div>

                {/* Description Quote Card */}
                <div
                  className="p-4 rounded-2xl border-l-4 mb-4 bg-white shadow-xs"
                  style={{
                    borderLeftColor: activeMode.color,
                    borderTop: '1px solid #EAE3D5',
                    borderRight: '1px solid #EAE3D5',
                    borderBottom: '1px solid #EAE3D5',
                  }}
                >
                  <p className="text-xs sm:text-sm text-[#181226] font-semibold leading-relaxed">
                    {activeMode.description}
                  </p>
                </div>

                {/* 3 Key Feature Capsules */}
                <div className="space-y-2.5 mb-4">
                  {activeMode.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="p-3 sm:p-3.5 rounded-2xl border flex items-start gap-3 transition-colors"
                      style={{
                        backgroundColor: activeMode.colorLight,
                        borderColor: activeMode.colorBorder,
                      }}
                    >
                      <span
                        className="w-6 h-6 rounded-xl flex items-center justify-center text-white shrink-0 text-xs font-black shadow-2xs mt-0.5"
                        style={{ backgroundColor: activeMode.color }}
                      >
                        {idx + 1}
                      </span>
                      <div className="text-xs leading-snug">
                        <p className="font-black text-[#181226]">{feat.title}</p>
                        <p className="text-[#574F6B] font-medium mt-0.5">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ideal For Block */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-[#EAE3D5] shadow-2xs flex items-center gap-3 mb-5">
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 text-xs font-black shadow-2xs"
                    style={{ backgroundColor: activeMode.color }}
                  >
                    OK
                  </div>
                  <div className="text-xs leading-tight">
                    <strong className="font-black text-[#181226]">Recomendado para: </strong>
                    <span className="text-[#4B435C] font-medium">{activeMode.idealFor}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons & Reassuring Note */}
              <div className="pt-2">
                <p className="text-[11px] text-center text-[#8E869E] font-medium mb-3">
                  Los integrantes y nombres de equipos se configuran en el lobby de la sala.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
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
                    className="flex-1 py-4 px-6 rounded-2xl text-white font-display font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg cursor-pointer transition-all active:scale-98 hover:scale-[1.01]"
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
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
