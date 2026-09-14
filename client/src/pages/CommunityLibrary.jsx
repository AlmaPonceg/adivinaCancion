import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVER_URL } from '../socket';

const GENRE_FILTERS = [
  { id: 'all', label: 'Todos los Géneros' },
  { id: 'Rock', label: 'Rock Nacional' },
  { id: 'Cumbia', label: 'Cumbia & Cuarteto' },
  { id: 'Pop', label: 'Pop' },
  { id: 'Reggaeton', label: 'Reggaeton' },
  { id: 'Animé', label: 'Animé & TV' },
  { id: 'Trap', label: 'Trap & Urbano' },
];

const SORT_OPTIONS = [
  { id: 'popular', label: 'Más Jugadas' },
  { id: 'recent', label: 'Más Recientes' },
  { id: 'tracks', label: 'Más Canciones' },
];

const LOCAL_STORAGE_MY_GAMES = 'trivia_my_created_games';

export default function CommunityLibrary() {
  const navigate = useNavigate();

  // ── Library Tab: 'community' | 'my_games' ──────────────────
  const [activeTab, setActiveTab] = useState('community');

  // ── Community Games State ──────────────────────────────────
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedSort, setSelectedSort] = useState('popular');

  // ── My Games State ─────────────────────────────────────────
  const [myGames, setMyGames] = useState([]);
  const [loadingMyGames, setLoadingMyGames] = useState(false);
  const [gameToDelete, setGameToDelete] = useState(null);

  // ── Inspect Modal State ────────────────────────────────────
  const [inspectingGame, setInspectingGame] = useState(null);
  const [inspectingTracks, setInspectingTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [antiSpoiler, setAntiSpoiler] = useState(true);
  const [launchingId, setLaunchingId] = useState(null);

  const baseUrl = SERVER_URL || window.location.origin;

  // ── Fetch Community Games ──────────────────────────────────
  const fetchCommunityGames = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedGenre !== 'all') params.set('genre', selectedGenre);
      if (selectedSort) params.set('sort', selectedSort);

      const res = await fetch(`${baseUrl}/api/games/public?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setGames(data.games || []);
      } else {
        setError(data.error || 'Error al cargar la biblioteca');
      }
    } catch (err) {
      console.error('Error fetching public games:', err);
      setError('No se pudo conectar con el servidor para obtener las partidas');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedGenre, selectedSort, baseUrl]);

  // Debounced search on input change
  useEffect(() => {
    if (activeTab === 'community') {
      const timer = setTimeout(() => {
        fetchCommunityGames();
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [fetchCommunityGames, activeTab]);

  // ── Fetch My Created Games ─────────────────────────────────
  const fetchMyGames = useCallback(async () => {
    try {
      setLoadingMyGames(true);
      const stored = localStorage.getItem(LOCAL_STORAGE_MY_GAMES);
      const localList = stored ? JSON.parse(stored) : [];

      if (localList.length === 0) {
        setMyGames([]);
        setLoadingMyGames(false);
        return;
      }

      const ids = localList.map((g) => g.id);
      const res = await fetch(`${baseUrl}/api/games/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.games)) {
        // Map full server records
        const serverMap = new Map(data.games.map((g) => [g.id, g]));
        const merged = localList.map((item) => {
          const serverData = serverMap.get(item.id);
          return serverData || item;
        });
        setMyGames(merged);
      } else {
        setMyGames(localList);
      }
    } catch (err) {
      console.error('Error fetching my games:', err);
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_MY_GAMES);
        setMyGames(stored ? JSON.parse(stored) : []);
      } catch {}
    } finally {
      setLoadingMyGames(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    if (activeTab === 'my_games') {
      fetchMyGames();
    }
  }, [activeTab, fetchMyGames]);

  // ── Inspect full game tracklist ─────────────────────────────
  const handleInspectGame = async (game) => {
    setInspectingGame(game);
    setLoadingTracks(true);
    setInspectingTracks([]);
    try {
      const res = await fetch(`${baseUrl}/api/games/${game.id}`);
      const data = await res.json();
      if (data.success && data.game) {
        setInspectingTracks(data.game.tracks || []);
      }
    } catch (err) {
      console.error('Error fetching game details:', err);
    } finally {
      setLoadingTracks(false);
    }
  };

  // ── Delete a Game (from server and local list) ───────────────
  const handleDeleteGame = async (game) => {
    try {
      await fetch(`${baseUrl}/api/games/${game.id}`, { method: 'DELETE' });

      // Remove from localStorage
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_MY_GAMES);
        if (stored) {
          const updated = JSON.parse(stored).filter((g) => g.id !== game.id);
          localStorage.setItem(LOCAL_STORAGE_MY_GAMES, JSON.stringify(updated));
        }
      } catch {}

      setMyGames((prev) => prev.filter((g) => g.id !== game.id));
      setGames((prev) => prev.filter((g) => g.id !== game.id));
      setGameToDelete(null);
    } catch (err) {
      console.error('Error deleting game:', err);
      alert('Error al eliminar la partida');
    }
  };

  // ── Launch and play game ────────────────────────────────────
  const handlePlayGame = async (game) => {
    setLaunchingId(game.id);
    try {
      const res = await fetch(`${baseUrl}/api/games/${game.id}`);
      const data = await res.json();
      const tracksToPlay = data.success && data.game ? data.game.tracks : [];

      if (tracksToPlay.length === 0) {
        alert('Esta partida no contiene canciones válidas para jugar');
        setLaunchingId(null);
        return;
      }

      // Record play count
      fetch(`${baseUrl}/api/games/${game.id}/play`, { method: 'POST' }).catch(() => {});

      // Save to localStorage playlist storage
      try {
        localStorage.setItem('trivia_playlist', JSON.stringify(tracksToPlay));
        localStorage.setItem('trivia_current_playlist', JSON.stringify(tracksToPlay));
        localStorage.setItem('trivia_selected_game_id', game.id);
      } catch (e) {
        console.warn('Storage warning:', e);
      }

      // Navigate to host lobby directly
      navigate('/host', {
        state: {
          preloadedPlaylist: tracksToPlay,
          suggestedMode: game.gameMode || 'auto',
          gameTitle: game.title,
        },
      });
    } catch (err) {
      console.error('Error launching game:', err);
      alert('Hubo un error al iniciar la partida. Intentá nuevamente.');
      setLaunchingId(null);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col text-[var(--color-text-primary)]">
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col">
        {/* ── Top Header Navigation ──────────────────────────────── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="arcade-btn px-3 py-1.5 rounded-xl text-xs font-bold text-[#181226] hover:text-[#FF5722] flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5722]" />
                <h1 className="font-display font-black text-xl sm:text-2xl text-[#181226] tracking-tight">
                  Biblioteca de Partidas
                </h1>
              </div>
              <p className="text-xs text-[#6B6280] font-medium mt-0.5">
                Explorá, buscá y creá partidas de música para jugar con amigos al estilo Kahoot
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="arcade-btn-primary px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Crear Partida</span>
            </button>
          </div>
        </header>

        {/* ── Main Tab Navigation: Comunidad vs Mis Partidas ──────── */}
        <div className="flex items-center gap-2 mb-4 border-b border-[#EAE3D5] pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('community')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'community'
                ? 'bg-[#181226] text-white shadow-2xs'
                : 'bg-white text-[#574F6B] hover:text-[#181226] border border-[#EAE3D5]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Explorar Comunidad</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_games')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'my_games'
                ? 'bg-[#181226] text-white shadow-2xs'
                : 'bg-white text-[#574F6B] hover:text-[#181226] border border-[#EAE3D5]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <span>Mis Partidas Guardadas</span>
          </button>
        </div>

        {/* ── Tab 1: Community Games ──────────────────────────────── */}
        {activeTab === 'community' && (
          <>
            {/* Search & Filters */}
            <section className="party-card p-4 sm:p-5 rounded-2xl mb-6 shadow-sm shrink-0 space-y-3.5">
              <div className="relative flex items-center">
                <svg
                  className="w-5 h-5 text-[#8E869E] absolute left-3.5 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscá por título de partida, artista, canción o creador..."
                  className="w-full pl-11 pr-10 py-3 rounded-xl bg-[#FAF7F2] border-2 border-[#EAE3D5] text-sm text-[#181226] font-medium placeholder-[#8E869E] focus:outline-none focus:border-[#FF5722] transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 text-[#8E869E] hover:text-[#181226] p-1 cursor-pointer"
                    title="Borrar búsqueda"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filter Controls: Clean 2-tier layout */}
              <div className="pt-3 border-t border-[#EAE3D5] space-y-3">
                {/* Genre Filter Pills: wraps cleanly, no overflow cut-offs or ugly scrollbars */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black text-[#8E869E] uppercase tracking-wider mr-1">
                    Género:
                  </span>
                  {GENRE_FILTERS.map((genre) => (
                    <button
                      key={genre.id}
                      type="button"
                      onClick={() => setSelectedGenre(genre.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedGenre === genre.id
                          ? 'bg-[#181226] text-white shadow-xs'
                          : 'bg-[#FAF7F2] text-[#574F6B] hover:text-[#181226] hover:bg-[#EAE3D5] border border-[#EAE3D5]'
                      }`}
                    >
                      {genre.label}
                    </button>
                  ))}
                </div>

                {/* Sub-bar: Results count on left, Sort on right */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#F0EBE1]">
                  <span className="text-xs font-bold text-[#6B6280]">
                    {games.length} {games.length === 1 ? 'partida pública encontrada' : 'partidas públicas encontradas'}
                  </span>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] font-bold text-[#8E869E] uppercase tracking-wider">
                      Ordenar por:
                    </span>
                    <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#EAE3D5]">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedSort(opt.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            selectedSort === opt.id
                              ? 'bg-white text-[#181226] shadow-2xs font-black'
                              : 'text-[#6B6280] hover:text-[#181226]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs sm:text-sm font-semibold mb-6 flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={fetchCommunityGames}
                  className="underline font-bold hover:text-black cursor-pointer ml-4"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Games Grid */}
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 rounded-full border-3 border-[#FF5722] border-t-transparent animate-spin mb-4" />
                <p className="font-extrabold text-sm text-[#181226]">Buscando partidas en la comunidad...</p>
              </div>
            ) : games.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border-2 border-[#EAE3D5] my-6">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] flex items-center justify-center text-[#8E869E] font-black text-lg mb-3">
                  ♪
                </div>
                <h3 className="font-display font-black text-base text-[#181226] mb-1">
                  No se encontraron partidas públicas
                </h3>
                <p className="text-xs text-[#6B6280] max-w-sm mb-4">
                  No hay partidas comunitarias que coincidan con los filtros actuales. ¡Podés crear la tuya y compartirla!
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/create')}
                  className="arcade-btn-primary px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer"
                >
                  + Crear Primera Partida
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="party-card bg-white p-5 rounded-2xl border-2 border-[#EAE3D5] hover:border-[#181226] transition-all flex flex-col justify-between shadow-xs group"
                  >
                    <div>
                      {/* Tags & Playcount */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="badge-tag text-[#FF5722] font-black text-[10px] tracking-wider truncate">
                          {game.genre || 'General'}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-[#6B6280] shrink-0 bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#EAE3D5]">
                          <svg className="w-3 h-3 text-[#FF5722]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          <span>{game.playCount || 0} jugadas</span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3
                        onClick={() => navigate(`/game/${game.id}`)}
                        className="font-display font-black text-base text-[#181226] leading-tight mb-1.5 group-hover:text-[#FF5722] transition-colors line-clamp-2 cursor-pointer"
                      >
                        {game.title}
                      </h3>
                      {game.description && (
                        <p className="text-xs text-[#6B6280] line-clamp-2 mb-3 leading-relaxed">
                          {game.description}
                        </p>
                      )}

                      {/* Track Samples Snippet */}
                      {Array.isArray(game.sampleTracks) && game.sampleTracks.length > 0 && (
                        <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EAE3D5] mb-4 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8E869E] block mb-1">
                            Incluye temas como:
                          </span>
                          {game.sampleTracks.slice(0, 3).map((st, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs text-[#181226] truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722] shrink-0" />
                              <span className="font-bold truncate">{st.title}</span>
                              {st.artist && <span className="text-[#8E869E] truncate">· {st.artist}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-[#EAE3D5] flex items-center justify-between gap-2 mt-2">
                      <div className="text-[11px] font-bold text-[#574F6B]">
                        Por <span className="text-[#181226]">{game.creatorName || 'Comunidad'}</span>
                        <span className="mx-1 text-[#8E869E]">·</span>
                        <span className="text-[#FF5722] font-black">{game.trackCount} temas</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => navigate(`/game/${game.id}`)}
                          className="arcade-btn px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#181226] hover:text-[#FF5722] bg-[#FAF7F2] border border-[#EAE3D5] cursor-pointer"
                          title="Ver detalles de la partida"
                        >
                          Ver Partida
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlayGame(game)}
                          disabled={launchingId === game.id}
                          className="arcade-btn-primary px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {launchingId === game.id ? (
                            <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                          <span>Jugar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Tab 2: My Created & Saved Games ─────────────────────── */}
        {activeTab === 'my_games' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border-2 border-[#EAE3D5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h2 className="font-display font-black text-sm text-[#181226] uppercase tracking-wider">
                  Partidas Creadas por Vos
                </h2>
                <p className="text-xs text-[#6B6280]">
                  Acá tenés todas las partidas que armaste (tanto públicas como privadas). Podés jugarlas, editarlas o borrarlas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/create')}
                className="arcade-btn-primary px-4 py-2 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Nueva Partida</span>
              </button>
            </div>

            {loadingMyGames ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 rounded-full border-3 border-[#FF5722] border-t-transparent animate-spin mx-auto mb-3" />
                <p className="font-black text-xs text-[#181226]">Cargando tus partidas...</p>
              </div>
            ) : myGames.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-2xl border-2 border-[#EAE3D5] my-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] flex items-center justify-center text-[#8E869E] font-black text-lg mx-auto mb-3">
                  ♪
                </div>
                <h3 className="font-display font-black text-base text-[#181226] mb-1">
                  Todavía no creaste ninguna partida
                </h3>
                <p className="text-xs text-[#6B6280] max-w-sm mx-auto mb-4">
                  Armá tu propio Kahoot musical con tus canciones preferidas, elegí si querés que sea pública o privada, y jugala cuando quieras.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/create')}
                  className="arcade-btn-primary px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer"
                >
                  + Crear mi Primera Partida
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                {myGames.map((game) => (
                  <div
                    key={game.id}
                    className="party-card bg-white p-5 rounded-2xl border-2 border-[#EAE3D5] hover:border-[#181226] transition-all flex flex-col justify-between shadow-xs group"
                  >
                    <div>
                      {/* Status Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          game.isPublic ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#F5F3FF] text-[#7C3AED]'
                        }`}>
                          {game.isPublic ? 'Pública' : 'Privada'}
                        </span>

                        <span className="text-[11px] font-bold text-[#8E869E]">
                          {game.tracksCount || (Array.isArray(game.tracks) ? game.tracks.length : 0)} canciones
                        </span>
                      </div>

                      <h3
                        onClick={() => navigate(`/game/${game.id}`)}
                        className="font-display font-black text-base text-[#181226] leading-tight mb-1.5 group-hover:text-[#FF5722] transition-colors cursor-pointer"
                      >
                        {game.title}
                      </h3>

                      {game.description && (
                        <p className="text-xs text-[#6B6280] line-clamp-2 mb-3 leading-relaxed">
                          {game.description}
                        </p>
                      )}

                      <div className="text-[11px] text-[#574F6B] font-bold mb-3">
                        Género: <span className="text-[#181226]">{game.genre || 'General'}</span>
                      </div>
                    </div>

                    {/* Actions: Jugar, Ver, Editar, Eliminar */}
                    <div className="pt-3 border-t border-[#EAE3D5] flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/game/${game.id}`)}
                          className="arcade-btn px-2 py-1.5 rounded-xl text-xs font-bold text-[#181226] hover:text-[#FF5722] bg-[#FAF7F2] border border-[#EAE3D5] cursor-pointer"
                          title="Ver partida"
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/create?id=${game.id}`)}
                          className="arcade-btn px-2 py-1.5 rounded-xl text-xs font-bold text-[#574F6B] hover:text-[#181226] bg-[#FAF7F2] border border-[#EAE3D5] cursor-pointer"
                          title="Editar esta partida"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setGameToDelete(game)}
                          className="p-1.5 rounded-xl text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer transition-colors"
                          title="Eliminar partida"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePlayGame(game)}
                        disabled={launchingId === game.id}
                        className="arcade-btn-primary px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {launchingId === game.id ? (
                          <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                        <span>Lanzar Sala</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Inspection Modal ───────────────────────────────────── */}
        <AnimatePresence>
          {inspectingGame && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="party-card bg-white p-6 rounded-3xl border-2 border-[#EAE3D5] max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#EAE3D5] shrink-0">
                  <div>
                    <span className="badge-tag text-[#FF5722] font-black text-[10px]">
                      {inspectingGame.genre || 'General'}
                    </span>
                    <h2 className="font-display font-black text-lg text-[#181226] leading-tight mt-0.5">
                      {inspectingGame.title}
                    </h2>
                    <p className="text-xs text-[#6B6280]">
                      Por {inspectingGame.creatorName || 'Comunidad'} · {inspectingTracks.length} canciones
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectingGame(null)}
                    className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE3D5] flex items-center justify-center text-[#8E869E] hover:text-[#181226] hover:bg-[#EAE3D5] cursor-pointer transition-colors"
                    title="Cerrar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Anti-spoiler Toggle */}
                <div className="py-2.5 px-3 my-3 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <div>
                      <span className="text-xs font-bold text-[#181226] block leading-none">
                        Modo Anti-Spoiler
                      </span>
                      <span className="text-[10px] text-[#6B6280]">
                        {antiSpoiler ? 'Oculta títulos para que quien organice no se queme las respuestas' : 'Respuestas visibles'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAntiSpoiler(!antiSpoiler)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                      antiSpoiler
                        ? 'bg-[#059669] text-white'
                        : 'bg-white border border-[#EAE3D5] text-[#181226]'
                    }`}
                  >
                    {antiSpoiler ? 'Activado' : 'Desactivado'}
                  </button>
                </div>

                {/* Tracklist List */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar my-1">
                  {loadingTracks ? (
                    <div className="py-12 text-center">
                      <div className="w-6 h-6 rounded-full border-2 border-[#FF5722] border-t-transparent animate-spin mx-auto mb-2" />
                      <p className="text-xs text-[#6B6280] font-bold">Cargando canciones...</p>
                    </div>
                  ) : inspectingTracks.length === 0 ? (
                    <p className="text-xs text-[#8E869E] text-center py-6">
                      No se encontraron detalles de canciones para esta partida.
                    </p>
                  ) : (
                    inspectingTracks.map((t, idx) => (
                      <div
                        key={t.id || idx}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-md bg-[#181226] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-extrabold text-[#181226] truncate ${
                                antiSpoiler ? 'blur-xs select-none' : ''
                              }`}
                            >
                              {t.title}
                            </p>
                            <p
                              className={`text-[11px] text-[#574F6B] truncate ${
                                antiSpoiler ? 'blur-xs select-none' : ''
                              }`}
                            >
                              {t.artist || 'Artista no especificado'}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] uppercase font-extrabold text-[#8E869E] shrink-0">
                          {t.type || 'youtube'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-[#EAE3D5] flex items-center justify-end gap-2.5 shrink-0 mt-2">
                  <button
                    type="button"
                    onClick={() => setInspectingGame(null)}
                    className="arcade-btn px-4 py-2 rounded-xl text-xs font-black text-[#574F6B] hover:text-[#181226] bg-[#FAF7F2] border border-[#EAE3D5] cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlayGame(inspectingGame)}
                    disabled={launchingId === inspectingGame.id}
                    className="arcade-btn-primary px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {launchingId === inspectingGame.id ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                    <span>Lanzar Partida Ahora</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Delete Confirmation Modal ──────────────────────────── */}
        <AnimatePresence>
          {gameToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="party-card bg-white p-6 rounded-3xl border-2 border-[#EAE3D5] max-w-sm w-full text-center shadow-2xl"
              >
                <div className="w-10 h-10 rounded-full bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center text-[#DC2626] mx-auto mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="font-display font-black text-base text-[#181226] mb-1">
                  ¿Eliminar esta partida?
                </h3>
                <p className="text-xs text-[#574F6B] mb-5">
                  Vas a eliminar permanentemente "{gameToDelete.title}". Esta acción no se puede deshacer.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGameToDelete(null)}
                    className="arcade-btn py-2 rounded-xl text-xs font-black text-[#574F6B] bg-[#FAF7F2] border border-[#EAE3D5] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGame(gameToDelete)}
                    className="py-2 rounded-xl text-xs font-black bg-[#DC2626] hover:bg-[#B91C1C] text-white cursor-pointer transition-colors"
                  >
                    Sí, eliminar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
