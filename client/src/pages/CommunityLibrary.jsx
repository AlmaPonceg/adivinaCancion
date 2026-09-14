import { useState, useEffect, useMemo, useCallback, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../socket';
import MusicPackCover from '../components/MusicPackCover';
import { MOOD_TILES } from '../utils/genreArt';

const GENRE_FILTERS = [
  { id: 'all', label: 'Todos los Géneros' },
  { id: 'Rock', label: 'Rock Nacional' },
  { id: 'Cumbia', label: 'Cumbia & Cuarteto' },
  { id: 'Pop', label: 'Hits Pop' },
  { id: 'Reggaeton', label: 'Reggaeton' },
  { id: 'Trap', label: 'Trap & Urbano' },
  { id: 'Animé', label: 'Animé & TV' },
];

const SORT_OPTIONS = [
  { id: 'popular', label: 'Más Jugadas' },
  { id: 'recent', label: 'Más Recientes' },
  { id: 'tracks', label: 'Más Canciones' },
];

const LOCAL_STORAGE_MY_GAMES = 'trivia_my_created_games';

export default function CommunityLibrary() {
  const navigate = useNavigate();
  const librarySearchId = useId();

  // ── Library Tab: 'community' | 'my_games' ──────────────────
  const [activeTab, setActiveTab] = useState('community');

  // ── Community Games State ──────────────────────────────────
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedSort, setSelectedSort] = useState('popular');
  const [hoveredCardId, setHoveredCardId] = useState(null);

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
      }, 250);
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

  // ── Delete a Game ───────────────────────────────────────────
  const handleDeleteGame = async (game) => {
    try {
      await fetch(`${baseUrl}/api/games/${game.id}`, { method: 'DELETE' });
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

  // ── Launch and play game directly ───────────────────────────
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

      fetch(`${baseUrl}/api/games/${game.id}/play`, { method: 'POST' }).catch(() => {});

      try {
        localStorage.setItem('trivia_playlist', JSON.stringify(tracksToPlay));
        localStorage.setItem('trivia_current_playlist', JSON.stringify(tracksToPlay));
        localStorage.setItem('trivia_selected_game_id', game.id);
      } catch (e) {
        console.warn('Storage warning:', e);
      }

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

  // ── Curated Slices ──────────────────────────────────────────
  const featuredGames = useMemo(() => {
    return games.slice(0, 3);
  }, [games]);

  const topRankedGames = useMemo(() => {
    return [...games].sort((a, b) => (b.playCount || 0) - (a.playCount || 0) || (b.trackCount || 0) - (a.trackCount || 0)).slice(0, 4);
  }, [games]);

  const partyGames = useMemo(() => {
    return games.filter((g) => {
      const genre = (g.genre || '').toLowerCase();
      return genre.includes('cumbia') || genre.includes('cuarteto') || genre.includes('reggaeton');
    });
  }, [games]);

  const rockPopGames = useMemo(() => {
    return games.filter((g) => {
      const genre = (g.genre || '').toLowerCase();
      return genre.includes('rock') || genre.includes('pop');
    });
  }, [games]);

  const urbanAnimeGames = useMemo(() => {
    return games.filter((g) => {
      const genre = (g.genre || '').toLowerCase();
      return genre.includes('trap') || genre.includes('anim') || genre.includes('serie');
    });
  }, [games]);

  const isBrowsingAll = activeTab === 'community' && selectedGenre === 'all' && !searchQuery.trim();

  return (
    <div className="min-h-screen bg-[#F5F2EB] text-[#181226] pb-16">
      {/* ── Top Header Navigation (Kahoot-Style) ─────────────────── */}
      <header className="bg-white border-b-2 border-[#EAE3D5] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Brand & Back */}
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

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FF5722] flex items-center justify-center text-white shadow-xs">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-[#181226] leading-none">
                  Biblioteca de Música
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF5722]">
                  Partidas Comunitarias & Propias
                </span>
              </div>
            </div>
          </div>

          {/* Center: Search Bar */}
          <div className="flex-1 max-w-md min-w-[220px]">
            <div className="relative">
              <label htmlFor={librarySearchId} className="sr-only">Buscar canciones, creador o género...</label>
              <input
                id={librarySearchId}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar canciones, creador o género..."
                className="w-full pl-9 pr-4 py-2 bg-[#FAF8F5] border-2 border-[#EAE3D5] rounded-xl text-xs font-semibold text-[#181226] placeholder-[#94A3B8] focus:outline-none focus:border-[#FF5722] focus:bg-white shadow-inner"
              />
              <svg className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
          </div>

          {/* Right: Tab Toggle & Create Button */}
          <div className="flex items-center gap-2">
            <div className="bg-[#FAF8F5] p-1 rounded-xl border border-[#EAE3D5] flex items-center gap-1 text-xs">
              <button
                onClick={() => { setActiveTab('community'); setSelectedGenre('all'); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'community'
                    ? 'bg-[#181226] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#181226]'
                }`}
              >
                Comunidad
              </button>
              <button
                onClick={() => setActiveTab('my_games')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'my_games'
                    ? 'bg-[#181226] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#181226]'
                }`}
              >
                Mis Partidas ({myGames.length})
              </button>
            </div>

            <button
              onClick={() => navigate('/create')}
              className="py-2 px-3.5 bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Crear</span>
            </button>
          </div>
        </div>

        {/* Quick Genre Pills (Horizontal bar) */}
        {activeTab === 'community' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 border-t border-[#EAE3D5] flex items-center gap-2 overflow-x-auto no-scrollbar">
            {GENRE_FILTERS.map((gf) => (
              <button
                key={gf.id}
                onClick={() => setSelectedGenre(gf.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                  selectedGenre === gf.id
                    ? 'bg-[#181226] text-white border-[#181226] shadow-xs'
                    : 'bg-[#FAF8F5] text-[#64748B] hover:text-[#181226] border-[#EAE3D5]'
                }`}
              >
                <span>{gf.label}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Main Content Area ───────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8">

        {/* ── ERROR BANNER ────────────────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#B91C1C]">
            {error}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 1: COMUNIDAD DISCOVERY VIEW                            */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'community' && (
          <>
            {/* If browsing default page without search, show Hero Mood Tiles + Featured Carousel + Rankings + Curated Shelves */}
            {isBrowsingAll && (
              <>
                {/* ── 0. KAHOOT-STYLE MOOD TILES (Categorías visuales con foto) ── */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FF5722]">
                      EXPLORÁ POR TEMÁTICA
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {MOOD_TILES.map((tile) => (
                      <div
                        key={tile.id}
                        onClick={() => setSelectedGenre(tile.id)}
                        className={`group relative h-24 sm:h-28 rounded-2xl overflow-hidden border-2 ${tile.borderColor} shadow-xs hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-end p-3`}
                      >
                        {/* Background Photo with dark gradient */}
                        <img
                          src={tile.image}
                          alt={tile.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className={`absolute inset-0 ${tile.bgColor}/80 mix-blend-multiply transition-opacity`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                        {/* Title & Subtitle */}
                        <div className="relative z-10">
                          <h4 className="font-black text-xs sm:text-sm text-white leading-tight">
                            {tile.title}
                          </h4>
                          <p className="text-[10px] text-white/75 font-medium truncate mt-0.5">
                            {tile.subtitle}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* ── 1. HERO SHOWCASE: Destacados de la Semana ──── */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FF5722]">
                        SELECCIÓN ESPECIAL
                      </span>
                      <h2 className="text-xl font-black text-[#181226] tracking-tight">
                        Colecciones Destacadas
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {featuredGames.map((game) => (
                      <div
                        key={game.id}
                        onMouseEnter={() => setHoveredCardId(game.id)}
                        onMouseLeave={() => setHoveredCardId(null)}
                        className="group bg-white rounded-3xl border-2 border-[#EAE3D5] p-3.5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                      >
                        <div>
                          {/* Real photo cover */}
                          <div className="mb-3 cursor-pointer" onClick={() => navigate(`/game/${game.id}`)}>
                            <MusicPackCover
                              genre={game.genre}
                              title={game.title}
                              gameId={game.id}
                              trackCount={game.trackCount}
                              playCount={game.playCount}
                              size="large"
                              isHovered={hoveredCardId === game.id}
                            />
                          </div>

                          <h3
                            onClick={() => navigate(`/game/${game.id}`)}
                            className="font-black text-base text-[#181226] group-hover:text-[#FF5722] transition-colors leading-snug line-clamp-1 mb-1 cursor-pointer"
                          >
                            {game.title}
                          </h3>
                          <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed mb-3">
                            {game.description || 'Partida de música interactiva creada por la comunidad.'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-[#EAE3D5] flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#64748B]">
                            <div className="w-5 h-5 rounded-full bg-[#181226] text-white flex items-center justify-center text-[10px]">
                              {(game.creatorName || 'C').charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[120px]">{game.creatorName || 'Comunidad'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/game/${game.id}`)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[#181226] border border-[#EAE3D5] cursor-pointer"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => handlePlayGame(game)}
                              disabled={launchingId === game.id}
                              className="px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#FF5722] hover:bg-[#E64A19] text-white shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <span>{launchingId === game.id ? 'Iniciando...' : 'Jugar'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* ── 2. RANKING STRIP: Top Partidas (#1 a #4) ───── */}
                <section className="bg-white rounded-3xl p-6 border-2 border-[#EAE3D5] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF5722]">
                        PODIUM DE LA COMUNIDAD
                      </span>
                      <h2 className="text-lg font-black text-[#181226] tracking-tight">
                        Top Partidas Más Populares
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {topRankedGames.map((game, index) => {
                      const rankColors = [
                        'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]', // #1 Gold
                        'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]', // #2 Silver
                        'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]', // #3 Bronze
                        'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]', // #4 Purple
                      ];

                      return (
                        <div
                          key={game.id}
                          className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE3D5] hover:border-[#FF5722]/50 hover:bg-white transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* Photo Thumbnail */}
                            <div className="mb-2.5">
                              <MusicPackCover
                                genre={game.genre}
                                title={game.title}
                                gameId={game.id}
                                trackCount={game.trackCount}
                                playCount={game.playCount}
                                size="small"
                              />
                            </div>

                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`w-5 h-5 rounded-lg font-black text-[10px] flex items-center justify-center border ${rankColors[index] || rankColors[3]}`}>
                                #{index + 1}
                              </span>
                              <h4 className="font-bold text-xs text-[#181226] line-clamp-1">
                                {game.title}
                              </h4>
                            </div>

                            <p className="text-[11px] text-[#64748B] line-clamp-1 mb-3">
                              Por {game.creatorName || 'Comunidad'}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-[#EAE3D5] flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#FF5722] flex items-center gap-1">
                              <span>▶</span>
                              <span>{game.playCount || 0} jugadas</span>
                            </span>

                            <button
                              onClick={() => navigate(`/game/${game.id}`)}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FAF8F5] border border-[#EAE3D5] text-[11px] font-bold text-[#181226] cursor-pointer"
                            >
                              Jugar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* ── 3. THEMATIC SHELF: Previa & Fiesta ───────────── */}
                {partyGames.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F43F5E]">
                          RITMO TROPICAL & BAILE
                        </span>
                        <h3 className="text-lg font-black text-[#181226] tracking-tight">
                          Para la Previa, Cumbias & Boliche
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {partyGames.map((game) => (
                        <GamePackCard
                          key={game.id}
                          game={game}
                          hoveredCardId={hoveredCardId}
                          setHoveredCardId={setHoveredCardId}
                          onInspect={() => handleInspectGame(game)}
                          onViewDetail={() => navigate(`/game/${game.id}`)}
                          onPlay={() => handlePlayGame(game)}
                          isLaunching={launchingId === game.id}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* ── 4. THEMATIC SHELF: Himnos del Rock & Pop ────── */}
                {rockPopGames.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF5722]">
                          GUITARRAS & HIMNOS ETERNOS
                        </span>
                        <h3 className="text-lg font-black text-[#181226] tracking-tight">
                          Rock Clásico, Nacional & Pop 2000s
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {rockPopGames.map((game) => (
                        <GamePackCard
                          key={game.id}
                          game={game}
                          hoveredCardId={hoveredCardId}
                          setHoveredCardId={setHoveredCardId}
                          onInspect={() => handleInspectGame(game)}
                          onViewDetail={() => navigate(`/game/${game.id}`)}
                          onPlay={() => handlePlayGame(game)}
                          isLaunching={launchingId === game.id}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* ── 5. THEMATIC SHELF: Urbano & Geek ────────────── */}
                {urbanAnimeGames.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A855F7]">
                          FLOW, BITS & CULTURA POP
                        </span>
                        <h3 className="text-lg font-black text-[#181226] tracking-tight">
                          Trap Argentino & Animé Nostalgia
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {urbanAnimeGames.map((game) => (
                        <GamePackCard
                          key={game.id}
                          game={game}
                          hoveredCardId={hoveredCardId}
                          setHoveredCardId={setHoveredCardId}
                          onInspect={() => handleInspectGame(game)}
                          onViewDetail={() => navigate(`/game/${game.id}`)}
                          onPlay={() => handlePlayGame(game)}
                          isLaunching={launchingId === game.id}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* If searching or filtering by a specific genre, show the focused grid */}
            {!isBrowsingAll && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[#181226]">
                      Resultados {selectedGenre !== 'all' ? `de ${selectedGenre}` : ''} {searchQuery ? `para "${searchQuery}"` : ''}
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      {games.length} {games.length === 1 ? 'partida encontrada' : 'partidas encontradas'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#64748B]">Ordenar:</span>
                    <select
                      value={selectedSort}
                      onChange={(e) => setSelectedSort(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-[#EAE3D5] rounded-xl text-xs font-bold text-[#181226] cursor-pointer"
                    >
                      {SORT_OPTIONS.map((so) => (
                        <option key={so.id} value={so.id}>{so.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="py-16 text-center text-xs font-bold text-[#64748B]">
                    Cargando catálogo...
                  </div>
                ) : games.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border-2 border-[#EAE3D5]">
                    <h3 className="text-base font-black text-[#181226] mb-1">No se encontraron partidas</h3>
                    <p className="text-xs text-[#64748B] mb-4">Intentá con otro término de búsqueda o eliminá el filtro de género.</p>
                    <button
                      onClick={() => { setSearchQuery(''); setSelectedGenre('all'); }}
                      className="px-4 py-2 bg-[#FF5722] text-white rounded-xl text-xs font-bold"
                    >
                      Restablecer filtros
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {games.map((game) => (
                      <GamePackCard
                        key={game.id}
                        game={game}
                        hoveredCardId={hoveredCardId}
                        setHoveredCardId={setHoveredCardId}
                        onInspect={() => handleInspectGame(game)}
                        onViewDetail={() => navigate(`/game/${game.id}`)}
                        onPlay={() => handlePlayGame(game)}
                        isLaunching={launchingId === game.id}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 2: MIS PARTIDAS GUARDADAS                              */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'my_games' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#181226]">Mis Partidas Creadas</h2>
                <p className="text-xs text-[#64748B]">
                  Partidas que creaste en este navegador. Podés editarlas, eliminarlas o iniciarlas cuando quieras.
                </p>
              </div>

              <button
                onClick={() => navigate('/create')}
                className="px-4 py-2 bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Crear Nueva</span>
              </button>
            </div>

            {loadingMyGames ? (
              <div className="py-16 text-center text-xs font-bold text-[#64748B]">
                Cargando tus partidas...
              </div>
            ) : myGames.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border-2 border-[#EAE3D5] shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] text-[#94A3B8] mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-base font-black text-[#181226] mb-1">Aún no creaste partidas</h3>
                <p className="text-xs text-[#64748B] mb-5 max-w-sm mx-auto">
                  Armá tu propia playlist de trivia musical con canciones de YouTube, elegí si querés que sea pública o privada y jugala con tus amigos.
                </p>
                <button
                  onClick={() => navigate('/create')}
                  className="px-5 py-2.5 bg-[#FF5722] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md cursor-pointer"
                >
                  Crear Mi Primera Partida
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myGames.map((game) => (
                  <div
                    key={game.id}
                    onMouseEnter={() => setHoveredCardId(game.id)}
                    onMouseLeave={() => setHoveredCardId(null)}
                    className="group bg-white rounded-3xl border-2 border-[#EAE3D5] p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="mb-3">
                        <MusicPackCover
                          genre={game.genre}
                          title={game.title}
                          gameId={game.id}
                          trackCount={game.trackCount || (Array.isArray(game.tracks) ? game.tracks.length : 0)}
                          playCount={game.playCount || 0}
                          isHovered={hoveredCardId === game.id}
                        />
                      </div>

                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          game.isPublic ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}>
                          {game.isPublic ? 'Pública' : 'Privada'}
                        </span>
                        <span className="text-[10px] text-[#94A3B8] font-semibold">
                          {game.genre || 'General'}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-[#181226] mb-1 line-clamp-1">
                        {game.title}
                      </h3>
                      <p className="text-xs text-[#64748B] line-clamp-2 mb-3">
                        {game.description || 'Sin descripción'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#EAE3D5] flex items-center justify-between">
                      <button
                        onClick={() => setGameToDelete(game)}
                        className="text-[11px] font-bold text-[#DC2626] hover:underline cursor-pointer"
                      >
                        Eliminar
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/game/${game.id}`)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[#181226] border border-[#EAE3D5] cursor-pointer"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => handlePlayGame(game)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase bg-[#FF5722] hover:bg-[#E64A19] text-white shadow-xs cursor-pointer"
                        >
                          Jugar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── Inspect Tracks Modal ─────────────────────────────────── */}
      {inspectingGame && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border-2 border-[#EAE3D5] shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE3D5]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FF5722]">
                  VISTA PREVIA DE PARTIDA
                </span>
                <h3 className="text-base font-black text-[#181226]">{inspectingGame.title}</h3>
                <p className="text-xs text-[#64748B]">
                  Por {inspectingGame.creatorName || 'Comunidad'} · {inspectingTracks.length} canciones
                </p>
              </div>
              <button
                onClick={() => setInspectingGame(null)}
                className="p-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#EAE3D5] text-[#181226] cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="py-2.5 flex items-center justify-between bg-[#FAF8F5] px-3 my-3 rounded-xl border border-[#EAE3D5]">
              <span className="text-xs font-bold text-[#181226]">Modo Anti-Spoilers</span>
              <button
                onClick={() => setAntiSpoiler(!antiSpoiler)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  antiSpoiler ? 'bg-[#181226] text-white' : 'bg-white text-[#64748B] border border-[#EAE3D5]'
                }`}
              >
                {antiSpoiler ? 'Ocultar Nombres' : 'Mostrar Nombres'}
              </button>
            </div>

            <div className="py-2 overflow-y-auto divide-y divide-[#EAE3D5] flex-1">
              {loadingTracks ? (
                <div className="py-8 text-center text-xs text-[#64748B]">Cargando canciones...</div>
              ) : (
                inspectingTracks.map((t, idx) => (
                  <div key={t.id || idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className={`font-bold text-[#181226] ${antiSpoiler ? 'blur-xs select-none' : ''}`}>
                        {idx + 1}. {t.title}
                      </div>
                      <div className={`text-[11px] text-[#64748B] ${antiSpoiler ? 'blur-xs select-none' : ''}`}>
                        {t.artist}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-[#EAE3D5] flex items-center justify-between">
              <button
                onClick={() => setInspectingGame(null)}
                className="px-4 py-2 bg-[#FAF8F5] text-xs font-bold text-[#64748B] rounded-xl cursor-pointer"
              >
                Cerrar
              </button>

              <button
                onClick={() => {
                  const g = inspectingGame;
                  setInspectingGame(null);
                  handlePlayGame(g);
                }}
                className="px-5 py-2 bg-[#FF5722] hover:bg-[#E64A19] text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm"
              >
                Empezar Partida Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ─────────────────────────────────── */}
      {gameToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border-2 border-[#EAE3D5] shadow-2xl text-center">
            <h3 className="text-base font-black text-[#181226] mb-2">¿Eliminar Partida?</h3>
            <p className="text-xs text-[#64748B] mb-5">
              Se eliminará <strong>{gameToDelete.title}</strong> de tu lista guardada.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setGameToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#FAF8F5] text-xs font-bold text-[#64748B] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteGame(gameToDelete)}
                className="flex-1 py-2.5 rounded-xl bg-[#DC2626] text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-xs"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * GamePackCard Sub-Component for photographic music cards
 */
function GamePackCard({ game, hoveredCardId, setHoveredCardId, onInspect, onViewDetail, onPlay, isLaunching }) {
  const isHovered = hoveredCardId === game.id;

  return (
    <div
      onMouseEnter={() => setHoveredCardId(game.id)}
      onMouseLeave={() => setHoveredCardId(null)}
      className="group bg-white rounded-3xl border-2 border-[#EAE3D5] p-3.5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        {/* Real Photographic Cover */}
        <div className="mb-3 cursor-pointer" onClick={onViewDetail}>
          <MusicPackCover
            genre={game.genre}
            title={game.title}
            gameId={game.id}
            trackCount={game.trackCount || 0}
            playCount={game.playCount || 0}
            isHovered={isHovered}
          />
        </div>

        {/* Card Header & Title */}
        <h3
          onClick={onViewDetail}
          className="font-black text-sm text-[#181226] group-hover:text-[#FF5722] transition-colors leading-snug line-clamp-1 mb-1 cursor-pointer"
        >
          {game.title}
        </h3>

        <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed mb-3">
          {game.description || 'Partida de trivia musical interactiva.'}
        </p>

        {/* Sample Tracks Tags */}
        {Array.isArray(game.sampleTracks) && game.sampleTracks.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {game.sampleTracks.slice(0, 2).map((st, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FAF8F5] border border-[#EAE3D5] text-[#64748B] max-w-[140px] truncate">
                {st.title}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer & Actions */}
      <div className="pt-3 border-t border-[#EAE3D5] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#64748B]">
          <div className="w-5 h-5 rounded-full bg-[#181226] text-white flex items-center justify-center text-[9px]">
            {(game.creatorName || 'C').charAt(0).toUpperCase()}
          </div>
          <span className="truncate max-w-[100px]">{game.creatorName || 'Comunidad'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onViewDetail}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[#181226] border border-[#EAE3D5] cursor-pointer"
            title="Ver detalles de la partida"
          >
            Ver
          </button>

          <button
            onClick={onPlay}
            disabled={isLaunching}
            className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#FF5722] hover:bg-[#E64A19] text-white shadow-xs cursor-pointer flex items-center gap-1"
          >
            <span>{isLaunching ? '...' : 'Jugar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
