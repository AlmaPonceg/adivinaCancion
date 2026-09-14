import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export default function MemoryCodeModal() {
  const { isUnlockModalOpen, closeUnlockModal, unlockAlmaTheme } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isUnlockModalOpen) {
      setCode('');
      setError('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isUnlockModalOpen]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!code.trim() || loading) return;

    setLoading(true);
    setError('');

    const res = await unlockAlmaTheme(code);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Código incorrecto');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !loading) {
      closeUnlockModal();
    }
  };

  return (
    <AnimatePresence>
      {isUnlockModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E0A16]/75 backdrop-blur-xs animate-fade-in select-none"
          onKeyDown={handleKeyDown}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="party-card bg-white p-6 sm:p-8 rounded-[2rem] max-w-md w-full shadow-2xl relative border-2 border-[#EAE3D5]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={closeUnlockModal}
              disabled={loading}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE3D5] text-[#6B6280] hover:text-[#181226] flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header / Lock Icon */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-[#FFF0EB] border border-[#FF5722]/30 flex items-center justify-center text-[#FF5722] shrink-0 shadow-xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 id="modal-title" className="font-display font-black text-xl text-[#181226] leading-snug">
                  Modo Recuerdo
                </h3>
                <p className="text-xs text-[#6B6280] font-medium">
                  Edición Cumpleaños Alma #24
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#574F6B] leading-relaxed mb-5 font-medium">
              Ingresá la clave de acceso para activar el video de fondo original, la música conmemorativa y la estética del cumpleaños.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="memory-code-input" className="block text-xs font-bold text-[#181226] mb-1.5 uppercase tracking-wider">
                  Clave de Acceso
                </label>
                <input
                  id="memory-code-input"
                  ref={inputRef}
                  type="password"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (error) setError('');
                  }}
                  disabled={loading}
                  placeholder="Escribí el código..."
                  autoComplete="off"
                  className="w-full px-4 py-3 rounded-xl bg-[#FAF7F2] border-2 border-[#EAE3D5] text-[#181226] placeholder-[#A098AE] font-tactical text-sm focus:outline-none focus:border-[#FF5722] transition-colors"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-[#FFF0F3] border border-[#E11D48]/30 text-[#E11D48] text-xs font-bold flex items-start gap-2">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={closeUnlockModal}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl border border-[#EAE3D5] text-xs font-black text-[#6B6280] hover:text-[#181226] bg-[#FAF7F2] cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!code.trim() || loading}
                  className="flex-1 arcade-btn-primary py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <span>Desbloquear</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
