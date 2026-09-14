import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_MESSAGES = [
  'Organizando canciones...',
  'Cargando diversión...',
  'Afinando los parlantes...',
  'Buscando los mejores temazos...',
  'Mezclando ritmos irresistibles...',
  'Preparando la pista de baile...',
  'Sintonizando la mejor onda...',
  'Ajustando los bajos al máximo...',
  'Verificando que todo suene perfecto...',
  'Casi listo para cantar a todo pulmón...',
];

export default function PlaylistLoadingModal({
  isOpen = false,
  tag = 'DJ BOT EN ACCIÓN',
  title = 'Generando Playlist',
  subtitle = 'Buscando las mejores versiones y preparando la música sin spoilers.',
  messages = DEFAULT_MESSAGES,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 1900);
    return () => clearInterval(interval);
  }, [isOpen, messages.length]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-live="polite"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#181226]/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="party-card bg-white w-full max-w-md rounded-[2.5rem] p-7 sm:p-8 border-2 border-[#EAE3D5] shadow-2xl relative overflow-hidden flex flex-col items-center text-center"
          >
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFF0EB] border border-[#FF5722]/30 text-[#FF5722] text-[10px] font-black uppercase tracking-wider mb-4">
              <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-ping" />
              <span>{tag}</span>
            </div>

            {/* Animated Vinyl Disc */}
            <div className="relative my-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#181226] border-4 border-[#2A233C] shadow-xl flex items-center justify-center relative z-10"
              >
                {/* Vinyl Grooves */}
                <div className="absolute inset-2 rounded-full border border-white/10" />
                <div className="absolute inset-5 rounded-full border border-white/10" />
                <div className="absolute inset-8 rounded-full border border-white/15" />

                {/* Center Label */}
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FF5722] flex items-center justify-center shadow-inner">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#F7F4EE] border-2 border-[#181226]" />
                </div>
              </motion.div>
            </div>

            {/* Sound Wave / Equalizer Bars */}
            <div className="flex items-center justify-center gap-1.5 h-8 my-3">
              {[0.1, 0.35, 0.2, 0.45, 0.25, 0.4].map((delay, i) => (
                <motion.div
                  key={i}
                  animate={{ height: ['20%', '100%', '35%', '85%', '20%'] }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.9,
                    delay,
                    ease: 'easeInOut',
                  }}
                  className="w-1.5 rounded-full bg-gradient-to-t from-[#FF5722] via-[#E11D48] to-[#9333EA]"
                />
              ))}
            </div>

            {/* Rotating Dynamic Phrase */}
            <div className="w-full min-h-[3.25rem] flex items-center justify-center px-2 my-1">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentIndex}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="text-lg sm:text-xl font-display font-black text-[#181226] tracking-tight leading-snug"
                >
                  {messages[currentIndex] || messages[0]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full max-w-xs h-2 bg-[#FAF7F2] border border-[#EAE3D5] rounded-full overflow-hidden my-3 relative">
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                className="w-1/2 h-full bg-[#FF5722] rounded-full"
              />
            </div>

            {/* Subtitle / Context Note */}
            <p className="text-xs text-[#6B6280] max-w-xs mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
