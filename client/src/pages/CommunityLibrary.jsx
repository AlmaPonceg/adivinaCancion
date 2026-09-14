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

export default function CommunityLibrary() {
  const navigate = useNavigate();

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedSort, setSelectedSort] = useState('popular');
  const [inspectingGame, setInspectingGame] = useState(null);
  const [inspectingTracks, setInspectingTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [antiSpoiler, setAntiSpoiler] = useState(true);
  const [launchingId, setLaunchingId] = useState(null);

  const baseUrl = SERVER_URL || window.location.origin;

  const fetchGames = useCallback(async () => {
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
    const timer = setTimeout(() => {
      fetchGames();
    }, 280);
    return () => clearTimeout(timer);
  }, [fetchGames]);

  // Inspect full game tracklist
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

  // Launch and play game
  const handlePlayGame = async (game) => {
    setLaunchingId(game.id);
    try {
      // 1. Fetch full game tracks if needed
      const res = await fetch(`${baseUrl}/api/games/${game.id}`);
      const data = await res.json();
      const tracksToPlay = data.success && data.game ? data.game.tracks : [];

      if (tracksToPlay.length === 0) {
        alert('Esta partida no contiene canciones válidas para jugar');
        setLaunchingId(null);
        return;
      }

      // 2. Increment play counter
      fetch(`${baseUrl}/api/games/${game.id}/play`, { method: 'POST' }).catch(() => {});

      // 3. Save to localStorage playlist storage
      try {
        localStorage.setItem('trivia_current_playlist', JSON.stringify(tracksToPlay));
        localStorage.setItem('trivia_selected_game_id', game.id);
      } catch (e) {
        console.warn('Storage warning:', e);
      }

      // 4. Navigate to host lobby directly
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
                  Biblioteca Comunitaria
                </h1>
              </div>
              <p className="text-xs text-[#6B6280] font-medium mt-0.5">
                Explorá, buscá y jugá partidas creadas por la comunidad de jugadores
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/host')}
              className="arcade-btn-primary px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Crear Nueva Partida</span>
            </button>
          </div>
        </header>

        {/* ── Search Bar & Filter Controls ───────────────────────── */}
        <section className="party-card p-4 sm:p-5 rounded-2xl mb-6 shadow-sm shrink-0 space-y-3.5">
          {/* Main search text input */}
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

          {/* Genre and sorting pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#EAE3D5]">
            {/* Genre Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
              {GENRE_FILTERS.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => setSelectedGenre(genre.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedGenre === genre.id
                      ? 'bg-[#181226] text-white shadow-2xs'
                      : 'bg-[#FAF7F2] text-[#6B6280] hover:text-[#181226] border border-[#EAE3D5]'
                  }`}
                >
                  {genre.label}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[#8E869E] font-bold">Ordenar:</span>
              <div className="inline-flex rounded-xl bg-[#FAF7F2] p-1 border border-[#EAE3D5]">
                {SORT_OPTIONS.map((sort) => (
                  <button
                    key={sort.id}
                    type="button"
                    onClick={() => setSelectedSort(sort.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedSort === sort.id
                        ? 'bg-white text-[#181226] shadow-2xs'
                        : 'text-[#6B6280] hover:text-[#181226]'
                    }`}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Games Grid ─────────────────────────────────────────── */}
        <main className="flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 border-4 border-[#FF5722]/30 border-t-[#FF5722] rounded-full animate-spin mb-4" />
              <p className="font-bold text-sm text-[#6B6280]">Cargando partidas de la comunidad...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center party-card rounded-2xl">
              <p className="text-sm font-bold text-[#E11D48] mb-3">{error}</p>
              <button
                type="button"
                onClick={fetchGames}
                className="arcade-btn px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          ) : games.length === 0 ? (
            <div className="p-12 text-center party-card rounded-2xl">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#FAF7F2] border-2 border-[#EAE3D5] flex items-center justify-center text-[#8E869E]">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 className="font-display font-black text-lg text-[#181226] mb-1">
                No se encontraron partidas
              </h3>
              <p className="text-xs text-[#6B6280] max-w-sm mx-auto mb-4">
                No hay partidas que coincidan con la búsqueda actual. Probá cambiando los términos o creá la tuya.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGenre('all');
                }}
                className="arcade-btn px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
              {games.map((game) => {
                const isLaunching = launchingId === game.id;

                return (
                  <motion.article
                    key={game.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="party-card p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:border-[#DDD5C5] transition-all group"
                  >
                    <div>
                      {/* Top tags row */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#EAE3D5] text-[#181226]">
                          {game.genre}
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-[#6B6280] flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{game.playCount} {game.playCount === 1 ? 'jugada' : 'jugadas'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Game Title */}
                      <h3 className="font-display font-black text-lg text-[#181226] leading-tight mb-1 group-hover:text-[#FF5722] transition-colors">
                        {game.title}
                      </h3>

                      {/* Creator attribution */}
                      <p className="text-xs text-[#8E869E] font-medium mb-3">
                        Por <span className="font-bold text-[#181226]">{game.creatorName || 'Comunidad'}</span>
                        <span className="mx-1.5">·</span>
                        <span>{game.trackCount} canciones</span>
                      </p>

                      {/* Description */}
                      {game.description && (
                        <p className="text-xs text-[#574F6B] font-medium leading-relaxed mb-3 line-clamp-2">
                          {game.description}
                        </p>
                      )}

                      {/* Sample preview track tags */}
                      {game.sampleTracks && game.sampleTracks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {game.sampleTracks.slice(0, 3).map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#EAE3D5] text-[#574F6B] truncate max-w-[140px]"
                            >
                              {t.title}
                            </span>
                          ))}
                          {game.trackCount > 3 && (
                            <span className="text-[10px] font-bold text-[#8E869E] px-1 py-0.5">
                              +{game.trackCount - 3} más
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="pt-3 border-t border-[#EAE3D5] flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePlayGame(game)}
                        disabled={isLaunching}
                        className="arcade-btn-primary flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isLaunching ? (
                          <span>Cargando partida...</span>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            </svg>
                            <span>Jugar Partida</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInspectGame(game)}
                        className="arcade-btn px-3 py-2 rounded-xl text-xs font-bold text-[#181226] hover:text-[#FF5722] flex items-center justify-center gap-1 cursor-pointer"
                        title="Ver lista de canciones"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        <span>Ver lista</span>
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Modal: Inspeccionar Canciones ───────────────────────── */}
      <AnimatePresence>
        {inspectingGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E0A16]/75 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl border-2 border-[#DDD5C5] shadow-2xl p-6 w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden relative"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#EAE3D5] shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#EAE3D5] text-[#181226]">
                      {inspectingGame.genre}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#8E869E]">
                      {inspectingGame.trackCount} temas
                    </span>
                  </div>
                  <h3 className="font-display font-black text-xl text-[#181226] leading-tight">
                    {inspectingGame.title}
                  </h3>
                  <p className="text-xs text-[#8E869E]">
                    Por <span className="font-bold text-[#181226]">{inspectingGame.creatorName}</span>
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
                  <span className="text-xs font-bold text-[#181226]">
                    Modo Anti-Spoiler (Ocultar títulos)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAntiSpoiler(!antiSpoiler)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    antiSpoiler ? 'bg-[#FF5722]' : 'bg-[#DDD5C5]'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow-xs transition-transform transform ${
                      antiSpoiler ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Track list container */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {loadingTracks ? (
                  <div className="py-8 text-center text-xs font-bold text-[#8E869E]">
                    Cargando lista completa de canciones...
                  </div>
                ) : inspectingTracks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#8E869E]">
                    No se pudieron cargar los detalles de las canciones.
                  </div>
                ) : (
                  inspectingTracks.map((track, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-white border border-[#EAE3D5] font-mono font-bold text-[10px] text-[#8E869E] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className={`font-bold truncate ${antiSpoiler ? 'filter blur-[5px] select-none' : 'text-[#181226]'}`}>
                            {track.title || 'Canción'}
                          </p>
                          {track.artist && (
                            <p className={`text-[11px] text-[#6B6280] truncate ${antiSpoiler ? 'filter blur-[5px] select-none' : ''}`}>
                              {track.artist}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white border border-[#EAE3D5] text-[#8E869E] shrink-0">
                        {track.type || 'audio'}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Footer CTA */}
              <div className="pt-4 border-t border-[#EAE3D5] mt-3 flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setInspectingGame(null)}
                  className="arcade-btn px-4 py-2.5 rounded-xl text-xs font-bold text-[#181226] cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const g = inspectingGame;
                    setInspectingGame(null);
                    handlePlayGame(g);
                  }}
                  className="arcade-btn-primary flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                  <span>Lanzar Partida Ahora</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
