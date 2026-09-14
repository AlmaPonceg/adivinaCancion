import { useState, useEffect, useCallback, useId } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const searchInputId = useId();
  const passkeyInputId = useId();

  // Auth State
  const [token, setToken] = useState(() => sessionStorage.getItem('trivia_admin_token') || '');
  const [passkeyInput, setPasskeyInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Dashboard Data State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' | 'catalog' | 'profiles' | 'events'

  // Catalog Filters & Actions State
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogVisibilityFilter, setCatalogVisibilityFilter] = useState('all'); // 'all' | 'public' | 'private'
  const [selectedGameTracks, setSelectedGameTracks] = useState(null); // For inspect modal
  const [actionInProgress, setActionInProgress] = useState(null); // ID of game being modified

  // Notification Banner
  const [bannerMsg, setBannerMsg] = useState(null);

  const showBanner = (text, type = 'success') => {
    setBannerMsg({ text, type });
    setTimeout(() => setBannerMsg(null), 4000);
  };

  // ── Authentication ──────────────────────────────────────────

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!passkeyInput.trim()) {
      setAuthError('Por favor ingresá la clave de moderador.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError('');

    try {
      const res = await fetch(`${API_BASE}/api/admin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey: passkeyInput.trim() }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Clave de moderador inválida');
      }

      sessionStorage.setItem('trivia_admin_token', resData.token);
      setToken(resData.token);
      setPasskeyInput('');
    } catch (err) {
      setAuthError(err.message || 'Error al autenticar.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('trivia_admin_token');
    setToken('');
    setData(null);
  };

  // ── Fetch Dashboard Data ────────────────────────────────────

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: {
          'x-admin-token': token,
        },
      });

      if (res.status === 401) {
        handleLogout();
        setAuthError('Tu sesión de moderador ha expirado o no es válida.');
        return;
      }

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Error al cargar telemetría.');
      }

      setData(resData);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token, fetchDashboardData]);

  // Auto-refresh interval (every 6 seconds)
  useEffect(() => {
    if (!token || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 6000);
    return () => clearInterval(interval);
  }, [token, autoRefresh, fetchDashboardData]);

  // ── Moderation Actions ──────────────────────────────────────

  const handleToggleVisibility = async (gameId, currentTitle) => {
    setActionInProgress(gameId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/games/${gameId}/visibility`, {
        method: 'PUT',
        headers: { 'x-admin-token': token },
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Error al cambiar visibilidad');
      }

      showBanner(`Partida "${currentTitle}" ahora es ${resData.isPublic ? 'PÚBLICA' : 'PRIVADA'}.`);
      fetchDashboardData();
    } catch (err) {
      showBanner(err.message || 'Error al modificar visibilidad', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResetPlayCount = async (gameId, currentTitle) => {
    if (!window.confirm(`¿Estás seguro de reiniciar el contador de jugadas de "${currentTitle}" a 0?`)) {
      return;
    }

    setActionInProgress(gameId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/games/${gameId}/reset-plays`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Error al reiniciar contador');
      }

      showBanner(`Contador de jugadas de "${currentTitle}" reiniciado a 0.`);
      fetchDashboardData();
    } catch (err) {
      showBanner(err.message || 'Error al reiniciar jugadas', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteGame = async (gameId, currentTitle) => {
    if (!window.confirm(`ATENCIÓN: ¿Estás seguro de eliminar definitivamente la partida "${currentTitle}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setActionInProgress(gameId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/games/${gameId}/moderation`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Error al eliminar partida');
      }

      showBanner(`Partida "${currentTitle}" eliminada exitosamente.`);
      fetchDashboardData();
    } catch (err) {
      showBanner(err.message || 'Error al eliminar la partida', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCloseRoom = async (roomCode) => {
    if (!window.confirm(`¿Cerrar forzadamente la sala en vivo [${roomCode}]? Se notificará a los participantes.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/rooms/${roomCode}/close`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Error al cerrar sala');
      }

      showBanner(`Sala [${roomCode}] cerrada exitosamente.`);
      fetchDashboardData();
    } catch (err) {
      showBanner(err.message || 'Error al cerrar sala', 'error');
    }
  };

  const handleClearEvents = async () => {
    if (!window.confirm('¿Vaciar el historial de eventos recientes?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/events/clear`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      if (res.ok) {
        showBanner('Registro de eventos vaciado.');
        fetchDashboardData();
      }
    } catch (err) {
      showBanner('Error al vaciar eventos', 'error');
    }
  };

  const handleInspectGame = async (gameId) => {
    try {
      const res = await fetch(`${API_BASE}/api/games/${gameId}`);
      const resData = await res.json();
      if (res.ok && resData.success && resData.game) {
        setSelectedGameTracks(resData.game);
      } else {
        showBanner('No se pudieron obtener las canciones de la partida.', 'error');
      }
    } catch {
      showBanner('Error al inspeccionar partida.', 'error');
    }
  };

  // ── RENDER: Login Gate ───────────────────────────────────────

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border-2 border-[#EAE3D5] rounded-3xl p-8 sm:p-10 shadow-xl text-center">
          {/* Shield Badge */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#181226] flex items-center justify-center border-2 border-[#2A233D] shadow-md">
            <svg className="w-8 h-8 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>

          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-[#FF5722]">
            MODERACIÓN & AUDITORÍA
          </span>
          <h1 className="text-2xl font-black text-[#181226] mt-1 mb-2">
            Panel de Control Central
          </h1>
          <p className="text-xs text-[#64748B] mb-6 leading-relaxed">
            Ingresá la clave de moderador para acceder a la telemetría en tiempo real, estadísticas de tráfico y gestión del catálogo.
          </p>

          {authError && (
            <div className="mb-5 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#B91C1C]">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-left">
              <label htmlFor={passkeyInputId} className="block text-xs font-bold text-[#181226] mb-1.5 uppercase tracking-wider">
                Clave de Acceso
              </label>
              <input
                id={passkeyInputId}
                type="password"
                placeholder="Ingresá la clave de moderador..."
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 bg-[#FAF8F5] border-2 border-[#E5DFD5] rounded-xl text-sm font-semibold text-[#181226] placeholder-[#94A3B8] focus:outline-none focus:border-[#FF5722] focus:bg-white transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3.5 bg-[#FF5722] hover:bg-[#E64A19] text-white font-black text-sm rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
            >
              {isAuthenticating ? (
                <span>Verificando...</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 12.75v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span>Ingresar al Panel</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#EAE3D5]">
            <button
              onClick={() => navigate('/')}
              className="text-xs font-bold text-[#64748B] hover:text-[#181226] cursor-pointer"
            >
              Volver al inicio del juego
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Dashboard Content ───────────────────────────────

  const traffic = data?.traffic || { activeSockets: 0, requestsPerMinute: 0, totalRequests: 0 };
  const liveRooms = data?.liveRooms || { activeCount: 0, totalPlayersConnected: 0, rooms: [] };
  const catalog = data?.catalog || { totalGames: 0, publicCount: 0, privateCount: 0, totalRealPlays: 0, totalCatalogTracks: 0, games: [] };
  const profiles = data?.profiles || { totalCreators: 0, creators: [], totalPlayerSessions: 0, players: [] };
  const system = data?.system || {};
  const events = data?.events || [];

  // Filter games for catalog table
  const filteredGames = catalog.games.filter((g) => {
    const q = catalogSearch.toLowerCase().trim();
    const matchesQuery = !q ||
      (g.title || '').toLowerCase().includes(q) ||
      (g.creatorName || '').toLowerCase().includes(q) ||
      (g.genre || '').toLowerCase().includes(q);

    const matchesVisibility =
      catalogVisibilityFilter === 'all' ||
      (catalogVisibilityFilter === 'public' && g.isPublic) ||
      (catalogVisibilityFilter === 'private' && !g.isPublic);

    return matchesQuery && matchesVisibility;
  });

  return (
    <div className="min-h-screen bg-[#F5F2EB] text-[#181226] pb-16">
      {/* ── Banner Notification ─────────────────────────────────── */}
      {bannerMsg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold transition-all ${
          bannerMsg.type === 'error'
            ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#B91C1C]'
            : 'bg-[#ECFDF5] border-[#6EE7B7] text-[#065F46]'
        }`}>
          <span className="w-2 h-2 rounded-full bg-current" />
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {/* ── Navigation Header ───────────────────────────────────── */}
      <header className="bg-white border-b-2 border-[#EAE3D5] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#181226] flex items-center justify-center border border-[#2A233D] shadow-sm">
              <svg className="w-5 h-5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-[#181226]">
                  Panel de Moderador & Estadísticas
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  ONLINE
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] font-medium">
                Monitoreo en tiempo real · Métricas verificadas · Auditoría
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                autoRefresh
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                  : 'bg-[#FAF8F5] border-[#E5DFD5] text-[#64748B]'
              }`}
              title="Refrescar automáticamente cada 6 segundos"
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-[#22C55E]' : 'bg-[#94A3B8]'}`} />
              <span>Auto ({autoRefresh ? 'ON' : 'OFF'})</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2 bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#E5DFD5] rounded-xl text-[#181226] cursor-pointer transition-all disabled:opacity-50"
              title="Actualizar datos ahora"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>

            <button
              onClick={() => navigate('/library')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#E5DFD5] text-[#181226] cursor-pointer transition-all"
            >
              Ver Biblioteca
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] cursor-pointer transition-all"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Container ──────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* ── Error Notification ─────────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B] font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchDashboardData} className="underline text-xs cursor-pointer">
              Reintentar
            </button>
          </div>
        )}

        {/* ── KPI Executive Cards ─────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Conexiones & Tráfico */}
          <div className="bg-white p-5 rounded-2xl border-2 border-[#EAE3D5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black tracking-wider uppercase text-[#64748B]">
                Sockets en Vivo
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-bold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-[#181226] tracking-tight">
                {traffic.activeSockets}
              </div>
              <p className="text-xs text-[#64748B] mt-1 font-medium">
                <strong className="text-[#0284C7]">{traffic.requestsPerMinute} req/min</strong> · {traffic.totalRequests} peticiones
              </p>
            </div>
          </div>

          {/* Card 2: Salas Activas */}
          <div className="bg-white p-5 rounded-2xl border-2 border-[#EAE3D5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black tracking-wider uppercase text-[#64748B]">
                Salas en Ejecución
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-[#181226] tracking-tight">
                {liveRooms.activeCount}
              </div>
              <p className="text-xs text-[#64748B] mt-1 font-medium">
                <strong className="text-[#D97706]">{liveRooms.totalPlayersConnected}</strong> jugadores conectados ahora
              </p>
            </div>
          </div>

          {/* Card 3: Partidas Guardadas */}
          <div className="bg-white p-5 rounded-2xl border-2 border-[#EAE3D5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black tracking-wider uppercase text-[#64748B]">
                Partidas en Biblioteca
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-[#181226] tracking-tight">
                {catalog.totalGames}
              </div>
              <p className="text-xs text-[#64748B] mt-1 font-medium">
                <strong className="text-[#059669]">{catalog.publicCount} públicas</strong> · {catalog.privateCount} privadas
              </p>
            </div>
          </div>

          {/* Card 4: Jugadas Reales */}
          <div className="bg-white p-5 rounded-2xl border-2 border-[#EAE3D5] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black tracking-wider uppercase text-[#64748B]">
                Jugadas Reales
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FFEDE7] text-[#FF5722] flex items-center justify-center font-bold">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-[#181226] tracking-tight">
                {catalog.totalRealPlays}
              </div>
              <p className="text-xs text-[#64748B] mt-1 font-medium">
                <strong className="text-[#FF5722]">100% verificadas</strong> · sin números simulados
              </p>
            </div>
          </div>
        </section>

        {/* ── System Telemetry Status Bar ─────────────────────────── */}
        <section className="bg-white px-5 py-4 rounded-2xl border border-[#EAE3D5] shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <span className="text-[#64748B] font-medium">Uptime Servidor: </span>
              <strong className="font-bold text-[#181226]">{system.uptimeFormatted || 'Calculando...'}</strong>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#64748B] font-medium">Memoria Heap: </span>
              <strong className="font-bold text-[#181226]">
                {system.memoryHeapUsedMb || 0} MB / {system.memoryHeapTotalMb || 0} MB
              </strong>
              <div className="w-20 bg-[#E5DFD5] h-2 rounded-full overflow-hidden inline-block ml-1">
                <div
                  className={`h-full rounded-full ${
                    (system.memoryPercent || 0) > 85
                      ? 'bg-[#EF4444]'
                      : (system.memoryPercent || 0) > 70
                      ? 'bg-[#F59E0B]'
                      : 'bg-[#10B981]'
                  }`}
                  style={{ width: `${Math.min(system.memoryPercent || 0, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-[#64748B] font-mono">({system.memoryPercent || 0}%)</span>
            </div>

            <div>
              <span className="text-[#64748B] font-medium">Canciones Catalogadas: </span>
              <strong className="font-bold text-[#181226]">{catalog.totalCatalogTracks || 0}</strong>
            </div>

            <div>
              <span className="text-[#64748B] font-medium">Entorno: </span>
              <span className="font-mono text-[11px] font-semibold text-[#181226]">
                {system.nodeVersion} ({system.platform})
              </span>
            </div>
          </div>

          <div className="text-[#64748B] text-[11px]">
            Última sync: {lastRefreshed ? lastRefreshed.toLocaleTimeString() : 'Iniciando...'}
          </div>
        </section>

        {/* ── Main Tab Navigation ─────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b-2 border-[#EAE3D5] pb-px overflow-x-auto">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'rooms'
                ? 'bg-white text-[#FF5722] border-t-2 border-x-2 border-[#EAE3D5] shadow-xs'
                : 'text-[#64748B] hover:text-[#181226] bg-transparent'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            <span>Salas en Vivo ({liveRooms.activeCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'catalog'
                ? 'bg-white text-[#FF5722] border-t-2 border-x-2 border-[#EAE3D5] shadow-xs'
                : 'text-[#64748B] hover:text-[#181226] bg-transparent'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <span>Moderación de Catálogo ({catalog.totalGames})</span>
          </button>

          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'profiles'
                ? 'bg-white text-[#FF5722] border-t-2 border-x-2 border-[#EAE3D5] shadow-xs'
                : 'text-[#64748B] hover:text-[#181226] bg-transparent'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <span>Perfiles & Creadores ({profiles.totalCreators})</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'events'
                ? 'bg-white text-[#FF5722] border-t-2 border-x-2 border-[#EAE3D5] shadow-xs'
                : 'text-[#64748B] hover:text-[#181226] bg-transparent'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
            <span>Registro de Eventos ({events.length})</span>
          </button>
        </div>

        {/* ── TAB 1: Live Rooms & Monitor ─────────────────────────── */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#181226]">Salas Activas en Tiempo Real</h2>
                <p className="text-xs text-[#64748B]">Monitoreo de anfitriones, jugadores conectados y estados de partida.</p>
              </div>
            </div>

            {liveRooms.rooms.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border-2 border-[#EAE3D5] shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] text-[#94A3B8] mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-[#181226]">No hay salas activas en este momento</h3>
                <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                  Cuando un anfitrión cree una sala para jugar desde la biblioteca o el modo anfitrión, aparecerá aquí inmediatamente.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveRooms.rooms.map((room) => (
                  <div
                    key={room.code}
                    className="bg-white rounded-2xl p-5 border-2 border-[#EAE3D5] shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Room Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-[#64748B]">SALA</span>
                          <span className="px-2.5 py-1 bg-[#181226] text-[#FF5722] font-black text-sm tracking-widest rounded-lg font-mono">
                            {room.code}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          room.state === 'LOBBY'
                            ? 'bg-[#FEF3C7] text-[#D97706]'
                            : 'bg-[#EDE9FE] text-[#7C3AED]'
                        }`}>
                          {room.state}
                        </span>
                      </div>

                      {/* Room Stats */}
                      <div className="space-y-1.5 text-xs text-[#64748B] mb-4">
                        <div className="flex justify-between">
                          <span>Modo de Juego:</span>
                          <strong className="text-[#181226] uppercase">{room.gameMode}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Jugadores Conectados:</span>
                          <strong className="text-[#181226]">{room.connectedCount} / {room.playersCount}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Anfitrión Conectado:</span>
                          <strong className={room.hostConnected ? 'text-[#059669]' : 'text-[#DC2626]'}>
                            {room.hostConnected ? 'Sí' : 'Desconectado'}
                          </strong>
                        </div>
                      </div>

                      {/* Players list preview */}
                      {room.players.length > 0 && (
                        <div className="mb-4">
                          <span className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-1.5">
                            Jugadores en sala:
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {room.players.map((p) => (
                              <span
                                key={p.id}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                  p.connected
                                    ? 'bg-[#F0FDF4] border-[#DCFCE7] text-[#166534]'
                                    : 'bg-[#F1F5F9] border-[#E2E8F0] text-[#94A3B8] line-through'
                                }`}
                              >
                                {p.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-[#EAE3D5] flex items-center justify-end">
                      <button
                        onClick={() => handleCloseRoom(room.code)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] cursor-pointer transition-all"
                      >
                        Cerrar Sala
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: Catalog Moderation Table ─────────────────────── */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border-2 border-[#EAE3D5] shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <label htmlFor={searchInputId} className="sr-only">Buscar partida, creador o género</label>
                <input
                  id={searchInputId}
                  type="text"
                  placeholder="Buscar partida por título, creador o género..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#FAF8F5] border border-[#E5DFD5] rounded-xl text-xs font-semibold text-[#181226] placeholder-[#94A3B8] focus:outline-none focus:border-[#FF5722]"
                />
                <svg className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#64748B]">Visibilidad:</span>
                <select
                  value={catalogVisibilityFilter}
                  onChange={(e) => setCatalogVisibilityFilter(e.target.value)}
                  className="px-3 py-2 bg-[#FAF8F5] border border-[#E5DFD5] rounded-xl text-xs font-bold text-[#181226] focus:outline-none cursor-pointer"
                >
                  <option value="all">Todas ({catalog.totalGames})</option>
                  <option value="public">Solo Públicas ({catalog.publicCount})</option>
                  <option value="private">Solo Privadas ({catalog.privateCount})</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border-2 border-[#EAE3D5] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] border-b-2 border-[#EAE3D5] text-[#64748B] font-black uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Partida</th>
                      <th className="py-3 px-4">Creador</th>
                      <th className="py-3 px-4">Género & Modo</th>
                      <th className="py-3 px-4 text-center">Canciones</th>
                      <th className="py-3 px-4 text-center">Jugadas Reales</th>
                      <th className="py-3 px-4 text-center">Visibilidad</th>
                      <th className="py-3 px-4 text-right">Acciones de Moderación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE3D5]">
                    {filteredGames.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-[#94A3B8]">
                          No se encontraron partidas con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      filteredGames.map((game) => (
                        <tr key={game.id} className="hover:bg-[#FAF8F5] transition-colors">
                          {/* Title & Details */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#181226] text-xs max-w-xs truncate">
                              {game.title}
                            </div>
                            <div className="text-[10px] text-[#94A3B8] font-mono">
                              ID: {game.id}
                            </div>
                          </td>

                          {/* Creator */}
                          <td className="py-3.5 px-4 text-xs font-semibold text-[#64748B]">
                            {game.creatorName || 'Comunidad'}
                          </td>

                          {/* Genre & Mode */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F1F5F9] text-[#475569] mr-1.5">
                              {game.genre || 'General'}
                            </span>
                            <span className="text-[10px] text-[#94A3B8] uppercase">
                              {game.gameMode}
                            </span>
                          </td>

                          {/* Tracks */}
                          <td className="py-3.5 px-4 text-center font-bold text-[#181226]">
                            {game.trackCount}
                          </td>

                          {/* Real Plays */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 font-black text-[#181226] px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#EAE3D5]">
                              <span className="text-[#FF5722]">▶</span>
                              <span>{game.playCount || 0}</span>
                            </span>
                          </td>

                          {/* Visibility Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleVisibility(game.id, game.title)}
                              disabled={actionInProgress === game.id}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all disabled:opacity-50 ${
                                game.isPublic
                                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669] hover:bg-[#D1FAE5]'
                                  : 'bg-[#F1F5F9] border-[#CBD5E1] text-[#64748B] hover:bg-[#E2E8F0]'
                              }`}
                            >
                              {game.isPublic ? 'Pública' : 'Privada'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Inspect Tracks */}
                              <button
                                onClick={() => handleInspectGame(game.id)}
                                className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#EAE3D5] text-[#181226] border border-[#E5DFD5] transition-all cursor-pointer"
                                title="Ver canciones"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>

                              {/* Reset Plays */}
                              <button
                                onClick={() => handleResetPlayCount(game.id, game.title)}
                                disabled={actionInProgress === game.id}
                                className="p-1.5 rounded-lg bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] transition-all cursor-pointer disabled:opacity-50"
                                title="Reiniciar contador de jugadas a 0"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                              </button>

                              {/* Delete Game */}
                              <button
                                onClick={() => handleDeleteGame(game.id, game.title)}
                                disabled={actionInProgress === game.id}
                                className="p-1.5 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] transition-all cursor-pointer disabled:opacity-50"
                                title="Eliminar definitivamente"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: Profiles & Creators ──────────────────────────── */}
        {activeTab === 'profiles' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Creators Profiles */}
            <div className="bg-white p-5 rounded-2xl border-2 border-[#EAE3D5] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-[#181226] uppercase tracking-wider">
                  Creadores de la Comunidad ({profiles.totalCreators})
                </h3>
              </div>

              <div className="divide-y divide-[#EAE3D5] max-h-[500px] overflow-y-auto">
                {profiles.creators.map((c) => (
                  <div key={c.name} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E5DFD5] text-[#181226] font-black text-sm flex items-center justify-center">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#181226]">{c.name}</div>
                        <div className="text-[10px] text-[#64748B]">
                          {c.totalGames} partida(s) · {c.publicGames} públicas · {c.totalTracks} canciones
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-[#FF5722]">
                        {c.totalPlays} jugadas
                      </div>
                      <div className="text-[9px] text-[#94A3B8]">
                        acumuladas
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Player Gamer Profiles */}
            <div className="bg-white p-5 rounded-2xl border-2 border-[#EAE3D5] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-[#181226] uppercase tracking-wider">
                  Sesiones de Jugadores ({profiles.totalPlayerSessions})
                </h3>
              </div>

              {profiles.players.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#94A3B8]">
                  No se registraron sesiones de jugadores aún en este reinicio.
                </div>
              ) : (
                <div className="divide-y divide-[#EAE3D5] max-h-[500px] overflow-y-auto">
                  {profiles.players.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#181226] text-white font-bold text-xs flex items-center justify-center">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#181226]">{p.name}</div>
                          <div className="text-[10px] text-[#64748B] font-mono">
                            ID: {p.id.substring(0, 12)}...
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#EAE3D5] text-[#181226]">
                          {p.joinsCount} ingresos
                        </span>
                        <div className="text-[9px] text-[#94A3B8] mt-0.5">
                          Sala: {p.lastRoom || '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: Audit Event Stream ───────────────────────────── */}
        {activeTab === 'events' && (
          <div className="bg-white p-5 rounded-2xl border-2 border-[#EAE3D5] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-[#181226] uppercase tracking-wider">
                  Registro de Actividad en Vivo (Auditoría)
                </h3>
                <p className="text-xs text-[#64748B]">Eventos capturados en el servidor en tiempo real.</p>
              </div>
              <button
                onClick={handleClearEvents}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#E5DFD5] text-[#64748B] hover:text-[#181226] cursor-pointer"
              >
                Vaciar Registro
              </button>
            </div>

            {events.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#94A3B8]">
                El registro de eventos está vacío actualmente.
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E5DFD5] flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider mt-0.5 ${
                        evt.category === 'MOD'
                          ? 'bg-[#EDE9FE] text-[#7C3AED]'
                          : evt.category === 'ROOM'
                          ? 'bg-[#FEF3C7] text-[#D97706]'
                          : evt.category === 'PLAYER'
                          ? 'bg-[#E0F2FE] text-[#0284C7]'
                          : 'bg-[#ECFDF5] text-[#059669]'
                      }`}>
                        {evt.category}
                      </span>
                      <div>
                        <div className="font-semibold text-[#181226]">{evt.message}</div>
                        {evt.meta && (
                          <div className="text-[10px] text-[#94A3B8] font-mono mt-0.5">
                            {JSON.stringify(evt.meta)}
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] text-[#94A3B8] font-mono shrink-0">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Inspect Tracks Modal ─────────────────────────────────── */}
      {selectedGameTracks && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border-2 border-[#EAE3D5] shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE3D5]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FF5722]">
                  INSPECCIÓN DE CANCIONES
                </span>
                <h3 className="text-base font-black text-[#181226]">{selectedGameTracks.title}</h3>
                <p className="text-xs text-[#64748B]">
                  Creador: {selectedGameTracks.creatorName} · {selectedGameTracks.tracks?.length || 0} canciones
                </p>
              </div>
              <button
                onClick={() => setSelectedGameTracks(null)}
                className="p-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#EAE3D5] text-[#181226] cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="py-4 overflow-y-auto divide-y divide-[#EAE3D5] flex-1">
              {selectedGameTracks.tracks?.map((t, idx) => (
                <div key={t.id || idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#181226]">
                      {idx + 1}. {t.title}
                    </div>
                    <div className="text-[11px] text-[#64748B]">{t.artist}</div>
                  </div>
                  {t.url && (
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-[#FF5722] hover:underline"
                    >
                      Ver en YouTube
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#EAE3D5] text-right">
              <button
                onClick={() => setSelectedGameTracks(null)}
                className="px-4 py-2 bg-[#181226] hover:bg-[#2A233D] text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
