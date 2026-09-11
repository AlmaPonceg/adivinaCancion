import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WinnerDiploma({ winner, isOpen, onClose }) {
  const certificateRef = useRef(null);

  if (!isOpen || !winner) return null;

  // Format today's date in natural Spanish
  const todayFormatted = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const playerNames = (winner.players || [])
    .map((p) => p.name || p)
    .filter(Boolean);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = `🏆 ¡El equipo ${winner.name} salió campeón de "Adivina Tu Canción — Versión Cumple Alma" con ${winner.score} puntos! Integrantes: ${playerNames.join(', ')}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Diploma de Campeones — Adivina Tu Canción',
          text,
        });
      } catch (err) {
        // User cancelled share
      }
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert('¡Texto copiado al portapapeles para compartir!');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 16 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          className="relative w-full max-w-2xl my-auto flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Action Bar (Hidden during printing) */}
          <div className="w-full flex items-center justify-between gap-3 mb-3 no-print">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="console-btn-primary px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md hover:brightness-110 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir / Guardar PDF
              </button>
              <button
                onClick={handleShare}
                className="console-btn px-4 py-2 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Compartir
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-black cursor-pointer transition-colors"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ══════════ PHYSICAL DIPLOMA CANVAS ══════════ */}
          <div
            id="diploma-canvas"
            ref={certificateRef}
            className="w-full bg-[#FAF8F5] text-slate-900 rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden border-[6px] border-[#D4AF37] select-none"
            style={{
              boxShadow: '0 25px 60px -12px rgba(0,0,0,0.7), inset 0 0 40px rgba(212,175,55,0.15)',
            }}
          >
            {/* Inner Gold Frame Border */}
            <div className="absolute inset-2 sm:inset-3 border-2 border-[#C5A059] pointer-events-none rounded-xl" />
            <div className="absolute inset-3 sm:inset-4 border border-[#E8D3A2] pointer-events-none rounded-lg" />

            {/* Ornamental Corner Flourishes */}
            <span className="absolute top-4 left-4 text-[#C5A059] font-serif text-lg leading-none select-none pointer-events-none">✦</span>
            <span className="absolute top-4 right-4 text-[#C5A059] font-serif text-lg leading-none select-none pointer-events-none">✦</span>
            <span className="absolute bottom-4 left-4 text-[#C5A059] font-serif text-lg leading-none select-none pointer-events-none">✦</span>
            <span className="absolute bottom-4 right-4 text-[#C5A059] font-serif text-lg leading-none select-none pointer-events-none">✦</span>

            {/* Faint Music Watermark Background */}
            <div className="absolute inset-0 opacity-[0.035] flex items-center justify-center pointer-events-none select-none">
              <svg className="w-96 h-96 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>

            {/* Header / Seal */}
            <div className="text-center relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#B8860B] via-[#FFD700] to-[#DAA520] p-0.5 shadow-md mb-2">
                <div className="w-full h-full rounded-full bg-[#FAF8F5] border-2 border-[#B8860B] flex items-center justify-center text-[#B8860B]">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
              </div>

              <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.3em] text-[#996515]">
                DIPLOMA DE HONOR
              </p>
              <h2 className="font-heading text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
                CERTIFICADO DE CAMPEÓN
              </h2>
              <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent mx-auto my-2" />
            </div>

            {/* Recipient body */}
            <div className="text-center my-4 sm:my-6 relative z-10">
              <p className="text-xs sm:text-sm font-medium text-slate-600 italic mb-2">
                Se otorga el presente reconocimiento oficial al equipo:
              </p>

              <div className="inline-block my-1 px-5 py-2 rounded-xl bg-white border border-[#E8D3A2] shadow-xs">
                <h3
                  className="font-heading text-2xl sm:text-4xl font-black tracking-tight"
                  style={{ color: winner.color || '#4F46E5' }}
                >
                  {winner.name}
                </h3>
              </div>

              <p className="text-xs sm:text-sm font-medium text-slate-600 mt-2 max-w-md mx-auto">
                por consagrarse como el ganador absoluto del gran desafío musical
              </p>

              {/* Game Title Tag */}
              <div className="my-3">
                <span className="inline-block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 bg-[#EFE9DF] px-4 py-1.5 rounded-lg border border-[#D9CDBD]">
                  🎵 Adivina Tu Canción — Versión Cumple Alma
                </span>
              </div>

              {/* Members List */}
              {playerNames.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#E8D3A2]/80 max-w-lg mx-auto">
                  <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#996515] mb-2">
                    Integrantes del Equipo Campeón:
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {playerNames.map((name) => (
                      <span
                        key={name}
                        className="text-xs sm:text-sm font-extrabold text-slate-800 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-2xs"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Signatures & Date */}
            <div className="mt-6 pt-4 border-t border-[#E8D3A2] flex items-end justify-between gap-4 text-left relative z-10">
              {/* Date */}
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Fecha del certamen</p>
                <p className="text-xs sm:text-sm font-black text-slate-800 mt-0.5">
                  {todayFormatted}
                </p>
                <p className="text-[10px] font-bold text-[#996515] mt-0.5">
                  Puntaje de la victoria: {winner.score} pts
                </p>
              </div>

              {/* Seal Stamp */}
              <div className="text-right">
                <div className="inline-block text-center border-t-2 border-slate-800 pt-1 px-4">
                  <p className="font-heading text-xs sm:text-sm font-black text-slate-900 tracking-wider">
                    ALMA PONCE
                  </p>
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Homenajeada & Anfitriona
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
