import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';

function hexToRgb(hex) {
  let c = hex ? String(hex).replace('#', '') : 'D97706';
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return [217, 119, 6];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export default function WinnerDiploma({ winner, isOpen = true, onClose }) {
  const certificateRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!winner || isOpen === false) return null;

  // Format today's date in natural Spanish
  const todayFormatted = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const playerNames = (winner.players || [])
    .map((p) => p.name || p)
    .filter(Boolean);

  const handleDownloadPdf = () => {
    setIsExporting(true);
    try {
      // Create landscape A4 document (297 x 210 mm)
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // 1. Background Fill (Warm Ivory Parchment)
      doc.setFillColor(250, 248, 245);
      doc.rect(0, 0, 297, 210, 'F');

      // 2. Outer Heavy Gold Border
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(2.5);
      doc.roundedRect(10, 10, 277, 190, 4, 4, 'S');

      // 3. Inner Fine Gold Border
      doc.setDrawColor(197, 160, 89);
      doc.setLineWidth(0.8);
      doc.roundedRect(14, 14, 269, 182, 3, 3, 'S');

      // 4. Delicate Thin Inner Border
      doc.setDrawColor(232, 211, 162);
      doc.setLineWidth(0.3);
      doc.roundedRect(16, 16, 265, 178, 2, 2, 'S');

      // 5. Corner Flourishes
      doc.setTextColor(197, 160, 89);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('✦', 20, 22, { align: 'center' });
      doc.text('✦', 277, 22, { align: 'center' });
      doc.text('✦', 20, 191, { align: 'center' });
      doc.text('✦', 277, 191, { align: 'center' });

      // 6. Header Seal Medal
      doc.setFillColor(245, 197, 24);
      doc.setDrawColor(184, 134, 11);
      doc.setLineWidth(0.8);
      doc.circle(148.5, 30, 6.5, 'FD');

      doc.setFillColor(250, 248, 245);
      doc.circle(148.5, 30, 5, 'FD');

      doc.setTextColor(184, 134, 11);
      doc.setFontSize(10);
      doc.text('★', 148.5, 32.2, { align: 'center' });

      // 7. Eyebrow Tag
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(153, 101, 21);
      doc.text('D I P L O M A   D E   H O N O R', 148.5, 43, { align: 'center' });

      // 8. Main Certificate Title
      doc.setFontSize(26);
      doc.setTextColor(24, 18, 38);
      doc.text('CERTIFICADO DE CAMPEÓN', 148.5, 55, { align: 'center' });

      // Decorative divider line
      doc.setDrawColor(197, 160, 89);
      doc.setLineWidth(0.6);
      doc.line(110, 59, 187, 59);

      // 9. Body Introduction
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text('Se otorga el presente reconocimiento oficial al equipo:', 148.5, 70, { align: 'center' });

      // 10. Team Winner Box
      const [tr, tg, tb] = hexToRgb(winner.color);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(232, 211, 162);
      doc.setLineWidth(0.8);
      doc.roundedRect(65, 76, 167, 18, 4, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(tr, tg, tb);
      doc.text(String(winner.name || '').toUpperCase(), 148.5, 88.5, { align: 'center' });

      // 11. Consecration subtitle
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text('por consagrarse como el ganador absoluto del gran desafío musical', 148.5, 103, { align: 'center' });

      // 12. Game Title Tag
      doc.setFillColor(239, 233, 223);
      doc.setDrawColor(217, 205, 189);
      doc.setLineWidth(0.5);
      doc.roundedRect(75, 109, 147, 9, 2.5, 2.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('Adivina Tu Canción — Versión Cumple Alma', 148.5, 115, { align: 'center' });

      // 13. Team Members (if any)
      if (playerNames.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(153, 101, 21);
        doc.text('INTEGRANTES DEL EQUIPO CAMPEÓN:', 148.5, 127, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        const membersList = playerNames.slice(0, 14).join('   •   ') + (playerNames.length > 14 ? '  ...' : '');
        doc.text(membersList, 148.5, 134, { align: 'center' });
      }

      // 14. Footer / Signatures
      doc.setDrawColor(232, 211, 162);
      doc.setLineWidth(0.5);
      doc.line(30, 155, 267, 155);

      // Left Column: Date and Score
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('FECHA DEL CERTAMEN', 35, 164);

      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(todayFormatted, 35, 171);

      doc.setFontSize(9);
      doc.setTextColor(153, 101, 21);
      doc.text(`Puntaje de la victoria: ${winner.score} pts`, 35, 177);

      // Right Column: Alma Ponce Official Stamp
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.8);
      doc.line(205, 166, 262, 166);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('ALMA PONCE', 233.5, 172, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Homenajeada & Anfitriona', 233.5, 177, { align: 'center' });

      // Save PDF directly to user's disk
      const sanitizedName = (winner.name || 'Campeon').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_');
      doc.save(`Diploma-Campeon-${sanitizedName}.pdf`);
    } catch (err) {
      console.error('Error al generar diploma PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 overflow-y-auto">
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isExporting}
                className="arcade-btn-primary px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md active:scale-98 transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>{isExporting ? 'Generando PDF...' : 'Descargar PDF Oficial'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="arcade-btn px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#181226] flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <svg className="w-4 h-4 text-[#6B6280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Imprimir</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-[#1C162E] hover:bg-[#282040] text-[#D4CEE3] flex items-center justify-center font-black cursor-pointer transition-colors"
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
            className="w-full bg-[#FAF8F5] text-slate-900 rounded-2xl p-4 sm:p-10 shadow-2xl relative overflow-hidden border-4 sm:border-[6px] border-[#D4AF37] select-none"
            style={{
              boxShadow: '0 25px 60px -12px rgba(0,0,0,0.7), inset 0 0 40px rgba(212,175,55,0.15)',
            }}
          >
            {/* Inner Gold Frame Border */}
            <div className="absolute inset-1.5 sm:inset-3 border sm:border-2 border-[#C5A059] pointer-events-none rounded-xl" />
            <div className="absolute inset-2.5 sm:inset-4 border border-[#E8D3A2] pointer-events-none rounded-lg" />

            {/* Ornamental Corner Flourishes */}
            <span className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 text-[#C5A059] font-serif text-sm sm:text-lg leading-none select-none pointer-events-none">✦</span>
            <span className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 text-[#C5A059] font-serif text-sm sm:text-lg leading-none select-none pointer-events-none">✦</span>
            <span className="absolute bottom-2.5 left-2.5 sm:bottom-4 sm:left-4 text-[#C5A059] font-serif text-sm sm:text-lg leading-none select-none pointer-events-none">✦</span>
            <span className="absolute bottom-2.5 right-2.5 sm:bottom-4 sm:right-4 text-[#C5A059] font-serif text-sm sm:text-lg leading-none select-none pointer-events-none">✦</span>

            {/* Faint Music Watermark Background */}
            <div className="absolute inset-0 opacity-[0.035] flex items-center justify-center pointer-events-none select-none">
              <svg className="w-64 h-64 sm:w-96 sm:h-96 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>

            {/* Header / Seal */}
            <div className="text-center relative z-10">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#B8860B] via-[#FFD700] to-[#DAA520] p-0.5 shadow-md mb-2">
                <div className="w-full h-full rounded-full bg-[#FAF8F5] border-2 border-[#B8860B] flex items-center justify-center text-[#B8860B]">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
              </div>

              <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[#996515]">
                DIPLOMA DE HONOR
              </p>
              <h2 className="font-heading text-xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mt-1">
                CERTIFICADO DE CAMPEÓN
              </h2>
              <div className="w-20 sm:w-24 h-0.5 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent mx-auto my-2" />
            </div>

            {/* Recipient body */}
            <div className="text-center my-3 sm:my-6 relative z-10">
              <p className="text-xs sm:text-sm font-medium text-slate-600 italic mb-2">
                Se otorga el presente reconocimiento oficial al equipo:
              </p>

              <div className="inline-block my-1 px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-white border border-[#E8D3A2] shadow-xs max-w-full">
                <h3
                  className="font-heading text-xl sm:text-3xl md:text-4xl font-black tracking-tight break-words"
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
                  Adivina Tu Canción — Versión Cumple Alma
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
