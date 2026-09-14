import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, unlockAlmaTheme, isAlmaTheme, lockTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const userInputRef = useRef(null);

  useEffect(() => {
    if (isLoginModalOpen) {
      setUsername('');
      setPassword('');
      setError('');
      setInfoMessage('');
      setLoading(false);
      setTimeout(() => userInputRef.current?.focus(), 80);
    }
  }, [isLoginModalOpen]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (loading) return;

    setError('');
    setInfoMessage('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedPass) {
      setError('Por favor, ingresá la contraseña');
      return;
    }

    // Secret backdoor: empty username + secret code in password field
    if (trimmedUser === '') {
      setLoading(true);
      const res = await unlockAlmaTheme(trimmedPass);
      setLoading(false);

      if (res.success) {
        closeLoginModal();
      } else {
        setError('Usuario o contraseña incorrectos');
      }
      return;
    }

    // Standard user login placeholder (ready for Supabase integration)
    setInfoMessage('Las cuentas de usuario y guardado de playlists estarán disponibles en la próxima actualización con Supabase.');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !loading) {
      closeLoginModal();
    }
  };

  return (
    <AnimatePresence>
      {isLoginModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-title"
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
              onClick={closeLoginModal}
              disabled={loading}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE3D5] text-[#6B6280] hover:text-[#181226] flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-[#FAF7F2] border-2 border-[#EAE3D5] flex items-center justify-center text-[#181226] shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 id="login-title" className="font-display font-black text-xl text-[#181226] leading-snug">
                  Iniciar Sesión
                </h3>
                <p className="text-xs text-[#6B6280] font-medium">
                  Accedé a tus partidas y playlists
                </p>
              </div>
            </div>

            {isAlmaTheme && (
              <div className="mb-5 p-3 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] flex items-center justify-between text-xs">
                <span className="font-bold text-[#FF5722]">Modo Recuerdo Activo</span>
                <button
                  type="button"
                  onClick={() => {
                    lockTheme();
                    closeLoginModal();
                  }}
                  className="font-bold text-[#E11D48] hover:underline cursor-pointer"
                >
                  Cerrar sesión
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-username-input" className="block text-xs font-bold text-[#181226] mb-1.5 uppercase tracking-wider">
                  Usuario o Correo
                </label>
                <input
                  id="login-username-input"
                  ref={userInputRef}
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError('');
                    if (infoMessage) setInfoMessage('');
                  }}
                  disabled={loading}
                  placeholder="ej. usuario@correo.com"
                  autoComplete="username"
                  className="w-full px-4 py-3 rounded-xl bg-[#FAF7F2] border-2 border-[#EAE3D5] text-[#181226] placeholder-[#A098AE] font-tactical text-sm focus:outline-none focus:border-[#FF5722] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="login-password-input" className="block text-xs font-bold text-[#181226] mb-1.5 uppercase tracking-wider">
                  Contraseña
                </label>
                <input
                  id="login-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                    if (infoMessage) setInfoMessage('');
                  }}
                  disabled={loading}
                  placeholder="••••••••"
                  autoComplete="current-password"
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

              {infoMessage && (
                <div className="p-3 rounded-xl bg-[#F4F3FF] border border-[#6366F1]/30 text-[#4F46E5] text-xs font-bold leading-relaxed">
                  {infoMessage}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={closeLoginModal}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl border border-[#EAE3D5] text-xs font-black text-[#6B6280] hover:text-[#181226] bg-[#FAF7F2] cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 arcade-btn-primary py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Ingresando...</span>
                    </>
                  ) : (
                    <span>Iniciar Sesión</span>
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-[#EAE3D5] text-center">
                <Link
                  to="/admin"
                  onClick={closeLoginModal}
                  className="text-[11px] font-bold text-[#8E869E] hover:text-[#46178F] transition-colors"
                >
                  Acceso a Moderación y Estadísticas →
                </Link>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
