import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, loginModalConfig, unlockAlmaTheme, isAlmaTheme, lockTheme } = useTheme();
  const { login, register } = useAuth();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

  // Login form state
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const loginInputRef = useRef(null);
  const regInputRef = useRef(null);

  useEffect(() => {
    if (isLoginModalOpen) {
      const targetTab = loginModalConfig?.initialTab === 'register' ? 'register' : 'login';
      setActiveTab(targetTab);
      setLoginUser('');
      setLoginPass('');
      setRegUsername('');
      setRegEmail('');
      setRegPass('');
      setRegConfirmPass('');
      setError('');
      setInfoMessage('');
      setLoading(false);

      setTimeout(() => {
        if (targetTab === 'register') {
          regInputRef.current?.focus();
        } else {
          loginInputRef.current?.focus();
        }
      }, 90);
    }
  }, [isLoginModalOpen, loginModalConfig]);

  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    if (loading) return;

    setError('');
    setInfoMessage('');

    const trimmedUser = loginUser.trim();
    const trimmedPass = loginPass.trim();

    if (!trimmedPass) {
      setError(t('login.passRequired', 'Por favor, ingresá la contraseña'));
      return;
    }

    // Secret backdoor for Alma #24: empty username + secret code in password field
    if (trimmedUser === '') {
      setLoading(true);
      const res = await unlockAlmaTheme(trimmedPass);
      setLoading(false);

      if (res.success) {
        closeLoginModal();
      } else {
        setError(t('login.invalidCreds', 'Usuario o contraseña incorrectos'));
      }
      return;
    }

    // Standard user/creator authentication
    setLoading(true);
    const result = await login(trimmedUser, trimmedPass);
    setLoading(false);

    if (result.success) {
      closeLoginModal();
    } else {
      setError(result.error || t('login.invalidCreds', 'Usuario o contraseña incorrectos'));
    }
  };

  const handleRegisterSubmit = async (e) => {
    e?.preventDefault();
    if (loading) return;

    setError('');
    setInfoMessage('');

    const cleanUsername = regUsername.trim();
    const cleanPass = regPass.trim();
    const cleanConfirm = regConfirmPass.trim();

    if (!cleanUsername || cleanUsername.length < 2) {
      setError(t('login.userRequired', 'Ingresá un nombre de usuario de al menos 2 caracteres'));
      return;
    }

    if (!cleanPass || cleanPass.length < 4) {
      setError(t('login.passRequired', 'La contraseña debe tener al menos 4 caracteres'));
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setError(t('login.passMismatch', 'Las contraseñas no coinciden'));
      return;
    }

    setLoading(true);
    const result = await register({
      username: cleanUsername,
      password: cleanPass,
      email: regEmail.trim(),
    });
    setLoading(false);

    if (result.success) {
      closeLoginModal();
    } else {
      setError(result.error || 'Error al registrar la cuenta');
    }
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

            {/* Header with icon & title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-[#FAF7F2] border-2 border-[#EAE3D5] flex items-center justify-center text-[#181226] shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 id="login-title" className="font-display font-black text-xl text-[#181226] leading-snug">
                  {activeTab === 'login'
                    ? t('login.title', 'Iniciar Sesión')
                    : t('login.registerTitle', 'Creá tu Cuenta de Creador')}
                </h3>
                <p className="text-xs text-[#6B6280] font-medium">
                  {activeTab === 'login'
                    ? t('login.subtitle', 'Accedé a tus partidas y playlists')
                    : t('login.registerSubtitle', 'Publicá tus propias partidas con tu nombre verificado')}
                </p>
              </div>
            </div>

            {/* Reason Banner if triggered by game creation attempt */}
            {loginModalConfig?.reason === 'creator_required' && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border-2 border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <span className="text-base leading-none mt-0.5">🔒</span>
                <div>
                  <strong className="block font-black text-amber-950">
                    {t('login.requireLoginTitle', 'Iniciá Sesión para Crear Partidas')}
                  </strong>
                  <span className="font-medium leading-relaxed">
                    {t('login.requireLoginDesc', 'En Hitpop! las partidas se publican con tu identidad real de creador para que la comunidad sepa quién las creó.')}
                  </span>
                </div>
              </div>
            )}

            {/* Tab Switcher (Kahoot Crisp Style) */}
            <div className="bg-[#FAF7F2] p-1 rounded-xl border-2 border-[#EAE3D5] flex items-center gap-1 mb-5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError('');
                  setInfoMessage('');
                  setTimeout(() => loginInputRef.current?.focus(), 50);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-white text-[#181226] shadow-xs border border-[#EAE3D5]'
                    : 'text-[#6B6280] hover:text-[#181226]'
                }`}
              >
                {t('login.tabLogin', 'Iniciar Sesión')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setError('');
                  setInfoMessage('');
                  setTimeout(() => regInputRef.current?.focus(), 50);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-[#FF5722] text-white shadow-xs'
                    : 'text-[#6B6280] hover:text-[#181226]'
                }`}
              >
                {t('login.tabRegister', 'Crear Cuenta')}
              </button>
            </div>

            {isAlmaTheme && activeTab === 'login' && (
              <div className="mb-4 p-3 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] flex items-center justify-between text-xs">
                <span className="font-bold text-[#FF5722]">{t('login.memoryActive', 'Modo Recuerdo Activo')}</span>
                <button
                  type="button"
                  onClick={() => {
                    lockTheme();
                    closeLoginModal();
                  }}
                  className="font-bold text-[#E11D48] hover:underline cursor-pointer"
                >
                  {t('common.logout', 'Cerrar sesión')}
                </button>
              </div>
            )}

            {/* Form: Login Tab */}
            {activeTab === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-user-input" className="block text-xs font-bold text-[#181226] mb-1.5 uppercase tracking-wider">
                    {t('login.userLabel', 'Usuario o Correo')}
                  </label>
                  <input
                    id="login-user-input"
                    ref={loginInputRef}
                    type="text"
                    value={loginUser}
                    onChange={(e) => {
                      setLoginUser(e.target.value);
                      if (error) setError('');
                    }}
                    disabled={loading}
                    placeholder={t('login.userPlaceholder', 'ej. usuario@correo.com')}
                    autoComplete="username"
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF7F2] border-2 border-[#EAE3D5] text-[#181226] placeholder-[#A098AE] font-tactical text-sm focus:outline-none focus:border-[#FF5722] transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="login-pass-input" className="block text-xs font-bold text-[#181226] mb-1.5 uppercase tracking-wider">
                    {t('login.passLabel', 'Contraseña')}
                  </label>
                  <input
                    id="login-pass-input"
                    type="password"
                    value={loginPass}
                    onChange={(e) => {
                      setLoginPass(e.target.value);
                      if (error) setError('');
                    }}
                    disabled={loading}
                    placeholder={t('login.passPlaceholder', '••••••••')}
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

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={closeLoginModal}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl border border-[#EAE3D5] text-xs font-black text-[#6B6280] hover:text-[#181226] bg-[#FAF7F2] cursor-pointer transition-colors"
                  >
                    {t('common.cancel', 'Cancelar')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 arcade-btn-primary py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>{t('login.loggingIn', 'Ingresando...')}</span>
                      </>
                    ) : (
                      <span>{t('login.submitBtn', 'Iniciar Sesión')}</span>
                    )}
                  </button>
                </div>

                <div className="pt-3 border-t border-[#EAE3D5] text-center">
                  <Link
                    to="/admin"
                    onClick={closeLoginModal}
                    className="text-[11px] font-bold text-[#8E869E] hover:text-[#46178F] transition-colors"
                  >
                    {t('login.adminLink', 'Acceso a Moderación y Estadísticas →')}
                  </Link>
                </div>
              </form>
            ) : (
              /* Form: Register Tab */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="reg-username-input" className="block text-xs font-bold text-[#181226] mb-1 uppercase tracking-wider">
                    {t('login.usernameLabel', 'Nombre de Creador / Usuario')} <span className="text-[#FF5722]">*</span>
                  </label>
                  <input
                    id="reg-username-input"
                    ref={regInputRef}
                    type="text"
                    value={regUsername}
                    onChange={(e) => {
                      setRegUsername(e.target.value);
                      if (error) setError('');
                    }}
                    disabled={loading}
                    placeholder={t('login.usernamePlaceholder', 'ej. FacuRock, DJ Fiesta...')}
                    autoComplete="username"
                    maxLength={25}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border-2 border-[#EAE3D5] text-[#181226] placeholder-[#A098AE] font-tactical text-sm focus:outline-none focus:border-[#FF5722] transition-colors"
                  />
                  <span className="text-[10px] text-[#8E869E] mt-0.5 block">
                    Este es el nombre visible que aparecerá en las partidas que crees.
                  </span>
                </div>

                <div>
                  <label htmlFor="reg-email-input" className="block text-xs font-bold text-[#181226] mb-1 uppercase tracking-wider">
                    {t('login.emailLabel', 'Correo Electrónico (Opcional)')}
                  </label>
                  <input
                    id="reg-email-input"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    disabled={loading}
                    placeholder={t('login.emailPlaceholder', 'ej. usuario@correo.com')}
                    autoComplete="email"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border-2 border-[#EAE3D5] text-[#181226] placeholder-[#A098AE] font-tactical text-sm focus:outline-none focus:border-[#FF5722] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="reg-pass-input" className="block text-xs font-bold text-[#181226] mb-1 uppercase tracking-wider">
                      {t('login.passLabel', 'Contraseña')} <span className="text-[#FF5722]">*</span>
                    </label>
                    <input
                      id="reg-pass-input"
                      type="password"
                      value={regPass}
                      onChange={(e) => {
                        setRegPass(e.target.value);
                        if (error) setError('');
                      }}
                      disabled={loading}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border-2 border-[#EAE3D5] text-[#181226] placeholder-[#A098AE] font-tactical text-sm focus:outline-none focus:border-[#FF5722] transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-confirm-input" className="block text-xs font-bold text-[#181226] mb-1 uppercase tracking-wider">
                      {t('login.confirmPassLabel', 'Confirmar')} <span className="text-[#FF5722]">*</span>
                    </label>
                    <input
                      id="reg-confirm-input"
                      type="password"
                      value={regConfirmPass}
                      onChange={(e) => {
                        setRegConfirmPass(e.target.value);
                        if (error) setError('');
                      }}
                      disabled={loading}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border-2 border-[#EAE3D5] text-[#181226] placeholder-[#A098AE] font-tactical text-sm focus:outline-none focus:border-[#FF5722] transition-colors"
                    />
                  </div>
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
                    onClick={closeLoginModal}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl border border-[#EAE3D5] text-xs font-black text-[#6B6280] hover:text-[#181226] bg-[#FAF7F2] cursor-pointer transition-colors"
                  >
                    {t('common.cancel', 'Cancelar')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 arcade-btn-ruby py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>{t('login.registering', 'Creando cuenta...')}</span>
                      </>
                    ) : (
                      <span>{t('login.registerBtn', 'Crear Cuenta Gratis')}</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
