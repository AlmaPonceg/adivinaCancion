import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVER_URL } from '../socket';
import { PRESET_PACKS } from '../utils/presetPlaylists';
import { extractYoutubeId } from '../utils/trackHelper';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const GENRE_OPTIONS = [
  'Rock Argentino',
  'Cumbia & Cuarteto',
  'Pop Internacional',
  'Reggaeton & Urbano',
  'Nostalgia TV & Animé',
  'Trap & BZRP',
  '80s & 90s Retro',
  'Folclore & Tradicional',
  'General / Variado',
];

const LOCAL_STORAGE_MY_GAMES = 'trivia_my_created_games';

export default function GameCreator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editGameId = searchParams.get('id');

  const { user, token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { openLoginModal } = useTheme();

  // ── Game Metadata State ─────────────────────────────────────
  const [gameId, setGameId] = useState(editGameId || null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('General / Variado');
  const [creatorName, setCreatorName] = useState(() => {
    return user?.username || localStorage.getItem('trivia_creator_name') || '';
  });
  const [isPublic, setIsPublic] = useState(true);
  const [gameMode, setGameMode] = useState('auto');

  // Keep creatorName locked to verified user
  useEffect(() => {
    if (user?.username) {
      setCreatorName(user.username);
    }
  }, [user]);

  // ── Tracks List State ───────────────────────────────────────
  const [tracks, setTracks] = useState([]);
  const [editingTrackIndex, setEditingTrackIndex] = useState(null);

  // ── Add Track Tab State: 'search' | 'manual' | 'presets' ────
  const [activeAddTab, setActiveAddTab] = useState('search');

  // YouTube / Song Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [justAddedId, setJustAddedId] = useState(null);

  // Manual Input State
  const [manualTitle, setManualTitle] = useState('');
  const [manualArtist, setManualArtist] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualError, setManualError] = useState('');

  // Audio Preview State
  const [previewTrack, setPreviewTrack] = useState(null);

  // Save / Flow State
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedSuccessGame, setSavedSuccessGame] = useState(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  // ── Load Existing Game if Editing ───────────────────────────
  useEffect(() => {
    if (!editGameId) return;

    const loadGame = async () => {
      setIsLoadingExisting(true);
      try {
        const baseUrl = SERVER_URL || window.location.origin;
        const res = await fetch(`${baseUrl}/api/games/${editGameId}`);
        const data = await res.json();
        if (data.success && data.game) {
          const g = data.game;
          setGameId(g.id);
          setTitle(g.title || '');
          setDescription(g.description || '');
          setGenre(g.genre || 'General / Variado');
          setCreatorName(g.creatorName || '');
          setIsPublic(g.isPublic !== undefined ? g.isPublic : true);
          setGameMode(g.gameMode || 'auto');
          setTracks(g.tracks || []);
        } else {
          setSaveError('No se pudo cargar la partida para edición');
        }
      } catch (err) {
        console.error('Error loading game to edit:', err);
        setSaveError('Error de conexión al cargar la partida');
      } finally {
        setIsLoadingExisting(false);
      }
    };

    loadGame();
  }, [editGameId]);

  // ── Debounced Song Search ───────────────────────────────────
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setSearchError('');
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      try {
        const baseUrl = SERVER_URL || window.location.origin;
        const res = await fetch(`${baseUrl}/api/search-songs?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.results)) {
          setSearchResults(data.results);
        } else {
          setSearchResults([]);
          setSearchError('No se encontraron canciones para esta búsqueda');
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Search error:', err);
          setSearchError('Error al buscar canciones');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  // ── Add Track Handlers ──────────────────────────────────────
  const handleAddSearchResult = (song) => {
    const newTrack = {
      id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: song.title || 'Canción sin título',
      artist: song.artist || '',
      type: 'youtube',
      url: song.url || `https://www.youtube.com/watch?v=${song.id}`,
      duration: song.duration || '',
    };

    setTracks((prev) => [...prev, newTrack]);
    setJustAddedId(song.id);
    setTimeout(() => setJustAddedId(null), 1800);
  };

  const handleAddManualTrack = (e) => {
    e.preventDefault();
    setManualError('');

    if (!manualTitle.trim()) {
      setManualError('Ingresá el título de la canción');
      return;
    }

    if (!manualUrl.trim()) {
      setManualError('Ingresá el enlace de YouTube o archivo de audio');
      return;
    }

    const isYt = Boolean(extractYoutubeId(manualUrl));
    const newTrack = {
      id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: manualTitle.trim(),
      artist: manualArtist.trim() || 'Artista desconocido',
      type: isYt ? 'youtube' : 'url',
      url: manualUrl.trim(),
    };

    setTracks((prev) => [...prev, newTrack]);
    setManualTitle('');
    setManualArtist('');
    setManualUrl('');
  };

  const handleImportPresetPack = (pack) => {
    if (!pack || !pack.tracks) return;
    const mapped = pack.tracks.map((t, idx) => ({
      id: `pre_${pack.id}_${idx}_${Date.now()}`,
      title: t.title,
      artist: t.artist || '',
      type: t.type || 'youtube',
      url: t.url || '',
    }));

    setTracks((prev) => [...prev, ...mapped]);
    if (!title) setTitle(pack.name);
    if (!description) setDescription(pack.description);
    if (pack.genre) setGenre(pack.genre);
  };

  // ── Track List Management ───────────────────────────────────
  const handleRemoveTrack = (index) => {
    setTracks((prev) => prev.filter((_, i) => i !== index));
    if (editingTrackIndex === index) setEditingTrackIndex(null);
  };

  const handleMoveTrack = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= tracks.length) return;
    setTracks((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  };

  const handleUpdateTrackInline = (index, field, value) => {
    setTracks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // ── Save Game Handler ───────────────────────────────────────
  const handleSaveGame = async (andLaunch = false) => {
    setSaveError('');

    if (!isAuthenticated || !token) {
      setSaveError('Debés iniciar sesión o crear una cuenta para guardar y publicar tu partida.');
      openLoginModal({ initialTab: 'login', reason: 'creator_required' });
      return;
    }

    if (!title.trim()) {
      setSaveError('Por favor ingresá un nombre para tu partida');
      return;
    }

    if (tracks.length === 0) {
      setSaveError('Agregá al menos una canción a la partida antes de guardarla');
      return;
    }

    setIsSaving(true);
    try {
      const baseUrl = SERVER_URL || window.location.origin;
      const cleanCreator = (user?.username || creatorName || '').trim() || 'Anónimo';

      try {
        localStorage.setItem('trivia_creator_name', cleanCreator);
      } catch {}

      const payload = {
        title: title.trim(),
        description: description.trim(),
        genre: genre.trim(),
        creatorName: cleanCreator,
        isPublic: Boolean(isPublic),
        gameMode,
        tracks: tracks.map((t, idx) => ({
          id: t.id || `t_${idx}_${Date.now()}`,
          title: t.title || 'Canción sin título',
          artist: t.artist || 'Artista desconocido',
          type: t.type || 'youtube',
          url: t.url || '',
        })),
      };

      const authHeaders = {
        'Content-Type': 'application/json',
        'x-auth-token': token,
        Authorization: `Bearer ${token}`,
      };

      let resultGame;
      if (gameId) {
        // Update existing
        const res = await fetch(`${baseUrl}/api/games/${gameId}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.status === 401) {
          openLoginModal({ initialTab: 'login', reason: 'creator_required' });
          throw new Error('Tu sesión expiró. Por favor volvé a iniciar sesión.');
        }
        if (!data.success) throw new Error(data.error || 'Error al actualizar');
        resultGame = data.game;
      } else {
        // Create new
        const res = await fetch(`${baseUrl}/api/games`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.status === 401) {
          openLoginModal({ initialTab: 'login', reason: 'creator_required' });
          throw new Error('Tu sesión expiró o se requiere cuenta para crear partidas.');
        }
        if (!data.success) throw new Error(data.error || 'Error al crear');
        resultGame = data.game;
        setGameId(resultGame.id);
      }

      // Persist in local "My Created Games" list
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_MY_GAMES);
        const myGames = stored ? JSON.parse(stored) : [];
        const existingIdx = myGames.findIndex((g) => g.id === resultGame.id);
        const itemMeta = {
          id: resultGame.id,
          title: resultGame.title,
          genre: resultGame.genre,
          isPublic: resultGame.isPublic,
          tracksCount: resultGame.tracks.length,
          creatorName: resultGame.creatorName,
          updatedAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          myGames[existingIdx] = itemMeta;
        } else {
          myGames.unshift(itemMeta);
        }
        localStorage.setItem(LOCAL_STORAGE_MY_GAMES, JSON.stringify(myGames));
      } catch (err) {
        console.warn('LocalStorage error storing my game:', err);
      }

      if (andLaunch) {
        handleLaunchGame(resultGame);
      } else {
        setSavedSuccessGame(resultGame);
      }
    } catch (err) {
      console.error('Error saving game:', err);
      setSaveError(err.message || 'Error al guardar la partida');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLaunchGame = (gameToLaunch) => {
    const game = gameToLaunch || savedSuccessGame;
    if (!game) return;

    // Increment play count
    const baseUrl = SERVER_URL || window.location.origin;
    fetch(`${baseUrl}/api/games/${game.id}/play`, { method: 'POST' }).catch(() => {});

    // Save to local active playlist for HostLobby
    try {
      localStorage.setItem('trivia_playlist', JSON.stringify(game.tracks));
      localStorage.setItem('trivia_current_playlist', JSON.stringify(game.tracks));
      localStorage.setItem('trivia_selected_game_id', game.id);
    } catch {}

    // Navigate to host lobby
    navigate('/host', {
      state: {
        preloadedPlaylist: game.tracks,
        suggestedMode: game.gameMode || 'auto',
        gameTitle: game.title,
      },
    });
  };

  const previewYtId = useMemo(() => {
    if (!previewTrack) return null;
    return extractYoutubeId(previewTrack.url);
  }, [previewTrack]);

  if (isLoadingExisting || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F5F2EB]">
        <div className="party-card bg-white p-8 rounded-3xl border-2 border-[#EAE3D5] text-center max-w-sm w-full">
          <div className="w-8 h-8 rounded-full border-3 border-[#FF5722] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="font-black text-sm text-[#181226]">Cargando creador de partidas...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex flex-col items-center justify-center p-4 sm:p-6 text-[#181226]">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="party-card bg-white p-8 sm:p-10 rounded-[2.2rem] max-w-lg w-full text-center border-2 border-[#EAE3D5] shadow-xl"
        >
          <div className="w-16 h-16 rounded-3xl bg-[#FFF3EE] border-2 border-[#FFCCBA] text-[#FF5722] mx-auto flex items-center justify-center mb-5 shadow-inner">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <span className="badge-tag text-[#FF5722] font-black tracking-widest text-[11px] mb-2 inline-block">
            IDENTIDAD VERIFICADA REQUERIDA
          </span>

          <h2 className="font-display font-black text-2xl sm:text-3xl text-[#181226] mb-3 leading-snug">
            Iniciá sesión para crear partidas
          </h2>

          <p className="text-xs sm:text-sm text-[#574F6B] font-semibold leading-relaxed mb-6">
            En Hitpop!, las partidas de la biblioteca comunitaria están firmadas por cuentas de creadores reales. Creá tu cuenta gratis en 10 segundos o iniciá sesión para empezar a componer.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => openLoginModal({ initialTab: 'register', reason: 'creator_required' })}
              className="flex-1 arcade-btn-ruby py-3.5 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              Crear Cuenta Gratis
            </button>
            <button
              type="button"
              onClick={() => openLoginModal({ initialTab: 'login', reason: 'creator_required' })}
              className="flex-1 arcade-btn py-3.5 px-5 rounded-xl text-xs font-black uppercase tracking-wider text-[#181226] bg-[#FAF8F5] border-2 border-[#EAE3D5] hover:border-[#181226] flex items-center justify-center gap-2 cursor-pointer"
            >
              Iniciar Sesión
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-[#EAE3D5]">
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="text-xs font-bold text-[#8E869E] hover:text-[#181226] transition-colors cursor-pointer"
            >
              ← Volver a la Biblioteca de Música
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EB] text-[#181226] flex flex-col p-3 sm:p-6 lg:p-8">
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col">
        {/* ── Top Bar Header (Studio Navbar) ────────────────────── */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-4 sm:p-5 rounded-2xl border-2 border-[#EAE3D5] shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] flex items-center justify-center text-[#181226] hover:bg-[#EAE3D5] cursor-pointer transition-colors shrink-0"
              title="Volver a la Biblioteca"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="badge-tag text-[#FF5722] font-black tracking-wider text-[10px]">
                  {gameId ? 'EDITAR PARTIDA' : 'CREADOR DE PARTIDAS'}
                </span>
                <span className="text-xs text-[#8E869E]">·</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                  isPublic ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#F5F3FF] text-[#7C3AED]'
                }`}>
                  {isPublic ? 'Pública' : 'Privada'}
                </span>
              </div>
              <h1 className="font-display text-lg sm:text-xl font-black text-[#181226] tracking-tight leading-tight">
                {title.trim() || 'Nueva Partida de Trivia'}
              </h1>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-xs font-black text-[#574F6B]">
              <span className="text-[#FF5722]">{tracks.length}</span> {tracks.length === 1 ? 'canción' : 'canciones'}
            </div>

            <button
              type="button"
              onClick={() => handleSaveGame(false)}
              disabled={isSaving}
              className="arcade-btn-primary px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Guardar Partida</span>
                </>
              )}
            </button>

            {tracks.length > 0 && (
              <button
                type="button"
                onClick={() => handleSaveGame(true)}
                disabled={isSaving}
                className="arcade-btn px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black text-[#181226] hover:text-[#FF5722] flex items-center gap-1.5 cursor-pointer bg-[#FAF7F2] border border-[#EAE3D5]"
                title="Guarda la partida y lanza la sala en pantalla gigante para jugar ya"
              >
                <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Jugar Ahora</span>
              </button>
            )}
          </div>
        </header>

        {/* Global Error Banner if any */}
        {saveError && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs sm:text-sm font-bold flex items-center justify-between">
            <span>{saveError}</span>
            <button
              type="button"
              onClick={() => setSaveError('')}
              className="text-[#991B1B] hover:text-black font-black p-1 cursor-pointer"
              title="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Main Studio Grid ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          {/* Left Column: Metadata & Settings (4 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Game Info Card */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-[#EAE3D5] shadow-xs">
              <h2 className="font-display font-black text-sm uppercase tracking-wider text-[#181226] mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Configuración de la Partida</span>
              </h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-black text-[#574F6B] uppercase tracking-wider mb-1.5">
                    Nombre de la Partida <span className="text-[#FF5722]">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Rock Nacional 90s, Cumbias de Fiesta..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-sm font-bold text-[#181226] placeholder-[#8E869E] focus:bg-white focus:border-[#FF5722] outline-none"
                    maxLength={70}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-black text-[#574F6B] uppercase tracking-wider mb-1.5">
                    Descripción / Pistas (Opcional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej: Los himnos más cantados para jugar con amigos y familia..."
                    rows={2}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-xs sm:text-sm font-medium text-[#181226] placeholder-[#8E869E] focus:bg-white focus:border-[#FF5722] outline-none resize-none"
                    maxLength={200}
                  />
                </div>

                {/* Genre & Creator in 2 cols */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-[#574F6B] uppercase tracking-wider mb-1.5">
                      Género / Estilo
                    </label>
                    <select
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-xs font-bold text-[#181226] focus:bg-white focus:border-[#FF5722] outline-none cursor-pointer"
                    >
                      {GENRE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[#574F6B] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Tu Identidad de Creador</span>
                      <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Cuenta Verificada
                      </span>
                    </label>
                    <div className="w-full px-3 py-2 rounded-xl bg-purple-50/70 border-2 border-purple-200 text-xs font-black text-[#181226] flex items-center justify-between shadow-2xs select-none">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#46178F] text-white text-[10px] font-black flex items-center justify-center uppercase">
                          {(user?.username || creatorName || 'CR').slice(0, 2)}
                        </div>
                        <span className="font-display font-black text-sm">{user?.username || creatorName}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#46178F] text-white tracking-wider">
                        Creador
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Visibilidad (Pública / Privada) ─────────────── */}
                <div className="pt-2 border-t border-[#EAE3D5]">
                  <label className="block text-xs font-black text-[#574F6B] uppercase tracking-wider mb-2">
                    Visibilidad de la Partida <span className="text-[#FF5722]">*</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Public Option Card */}
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={`p-3 rounded-xl text-left border-2 transition-all cursor-pointer ${
                        isPublic
                          ? 'bg-[#ECFDF5] border-[#059669] shadow-xs'
                          : 'bg-[#FAF7F2] border-[#EAE3D5] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-[#059669] uppercase tracking-wider flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pública
                        </span>
                        {isPublic && (
                          <span className="w-2 h-2 rounded-full bg-[#059669]" />
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-[#574F6B] leading-tight">
                        Aparece en la biblioteca comunitaria para que cualquiera la busque y juegue.
                      </p>
                    </button>

                    {/* Private Option Card */}
                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`p-3 rounded-xl text-left border-2 transition-all cursor-pointer ${
                        !isPublic
                          ? 'bg-[#F5F3FF] border-[#7C3AED] shadow-xs'
                          : 'bg-[#FAF7F2] border-[#EAE3D5] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-[#7C3AED] uppercase tracking-wider flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Privada
                        </span>
                        {!isPublic && (
                          <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-[#574F6B] leading-tight">
                        Solo visible para vos y quien tenga el código directo. No aparece en el buscador público.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Helper Tips Card */}
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EAE3D5] text-xs text-[#574F6B]">
              <div className="font-bold text-[#181226] mb-1 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Consejo para anfitriones</span>
              </div>
              <p className="leading-relaxed">
                Una buena partida suele tener entre 10 y 15 canciones. Podés escuchar una prueba con el botón de play antes de guardar para asegurarte de que el audio funciona impecable.
              </p>
            </div>
          </div>

          {/* Right Column: Song Manager & Tracks (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Add Tracks Card */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-[#EAE3D5] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-black text-sm uppercase tracking-wider text-[#181226] flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Agregar Canciones a la Trivia</span>
                </h2>

                {/* Sub-tabs */}
                <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#EAE3D5]">
                  <button
                    type="button"
                    onClick={() => setActiveAddTab('search')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      activeAddTab === 'search'
                        ? 'bg-white text-[#181226] shadow-xs'
                        : 'text-[#8E869E] hover:text-[#181226]'
                    }`}
                  >
                    Buscador
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAddTab('manual')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      activeAddTab === 'manual'
                        ? 'bg-white text-[#181226] shadow-xs'
                        : 'text-[#8E869E] hover:text-[#181226]'
                    }`}
                  >
                    Enlace / Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAddTab('presets')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      activeAddTab === 'presets'
                        ? 'bg-white text-[#181226] shadow-xs'
                        : 'text-[#8E869E] hover:text-[#181226]'
                    }`}
                  >
                    Packs
                  </button>
                </div>
              </div>

              {/* Tab 1: Live Song Search */}
              {activeAddTab === 'search' && (
                <div className="space-y-3">
                  <div className="relative flex items-center">
                    <svg className="w-4 h-4 text-[#8E869E] absolute left-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por tema o artista (ej: Soda Stereo, Gilda, Bizarrap, Queen)..."
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-xs sm:text-sm font-bold text-[#181226] placeholder-[#8E869E] focus:bg-white focus:border-[#FF5722] outline-none"
                    />
                    {isSearching && (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-[#FF5722] border-t-transparent animate-spin absolute right-3" />
                    )}
                  </div>

                  {searchError && (
                    <p className="text-xs text-[#DC2626] font-bold">{searchError}</p>
                  )}

                  {/* Search Results List */}
                  {searchResults.length > 0 && (
                    <div className="max-h-56 overflow-y-auto space-y-1.5 border border-[#EAE3D5] rounded-xl p-2 bg-[#FAF7F2] custom-scrollbar">
                      {searchResults.map((song) => {
                        const isAdded = justAddedId === song.id;
                        return (
                          <div
                            key={song.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-[#EAE3D5] text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-extrabold text-[#181226] truncate">{song.title}</p>
                              {song.artist && (
                                <p className="text-[11px] text-[#574F6B] truncate">{song.artist}</p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddSearchResult(song)}
                              disabled={isAdded}
                              className={`px-2.5 py-1 rounded-lg font-black text-xs cursor-pointer transition-colors shrink-0 flex items-center gap-1 ${
                                isAdded
                                  ? 'bg-[#059669] text-white'
                                  : 'bg-[#FF5722] hover:bg-[#E64A19] text-white'
                              }`}
                            >
                              {isAdded ? (
                                <>
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Agregada</span>
                                </>
                              ) : (
                                <>
                                  <span>+ Agregar</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-[11px] text-[#8E869E] font-medium">
                    Escribí cualquier canción y sumala en 1 click con título y enlace de YouTube automático.
                  </p>
                </div>
              )}

              {/* Tab 2: Manual Link / Audio Track */}
              {activeAddTab === 'manual' && (
                <form onSubmit={handleAddManualTrack} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-[#574F6B] uppercase mb-1">
                        Título de la Canción <span className="text-[#FF5722]">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="Ej: De Música Ligera"
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-xs font-bold text-[#181226] placeholder-[#8E869E] focus:bg-white focus:border-[#FF5722] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-[#574F6B] uppercase mb-1">
                        Artista / Banda
                      </label>
                      <input
                        type="text"
                        value={manualArtist}
                        onChange={(e) => setManualArtist(e.target.value)}
                        placeholder="Ej: Soda Stereo"
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-xs font-bold text-[#181226] placeholder-[#8E869E] focus:bg-white focus:border-[#FF5722] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-[#574F6B] uppercase mb-1">
                      Enlace de YouTube o Audio MP3 <span className="text-[#FF5722]">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-xs font-bold text-[#181226] placeholder-[#8E869E] focus:bg-white focus:border-[#FF5722] outline-none"
                    />
                  </div>

                  {manualError && (
                    <p className="text-xs text-[#DC2626] font-bold">{manualError}</p>
                  )}

                  <button
                    type="submit"
                    className="arcade-btn-primary w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>+ Agregar Esta Canción</span>
                  </button>
                </form>
              )}

              {/* Tab 3: Preset Packs Import */}
              {activeAddTab === 'presets' && (
                <div className="space-y-2">
                  <p className="text-xs text-[#574F6B] font-bold mb-2">
                    Importá un pack curado de temas verificados para armar tu partida al instante:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRESET_PACKS.slice(0, 4).map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => handleImportPresetPack(pack)}
                        data-testid={`preset-pack-${pack.id}`}
                        className="preset-pack-btn p-3 rounded-xl bg-[#FAF7F2] hover:bg-white border border-[#EAE3D5] hover:border-[#FF5722] text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-extrabold text-xs text-[#181226] truncate">{pack.name}</span>
                          <span className="text-[10px] font-bold text-[#FF5722] shrink-0">+{pack.tracks.length}</span>
                        </div>
                        <p className="text-[11px] text-[#574F6B] line-clamp-1">{pack.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tracks List Card */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-[#EAE3D5] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-black text-sm uppercase tracking-wider text-[#181226] flex items-center gap-2">
                    <span>Canciones de la Partida</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#181226] text-white text-[11px] font-black">
                      {tracks.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#8E869E] font-medium">
                    Cada canción será una ronda en vivo donde los jugadores tendrán que adivinar con el pulsador.
                  </p>
                </div>

                {tracks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTracks([])}
                    className="text-xs text-[#DC2626] hover:underline font-bold cursor-pointer"
                  >
                    Vaciar lista
                  </button>
                )}
              </div>

              {tracks.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#FAF7F2] border-2 border-dashed border-[#EAE3D5] text-center">
                  <div className="w-10 h-10 rounded-full bg-white border border-[#EAE3D5] flex items-center justify-center text-[#8E869E] mx-auto mb-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                  <p className="font-extrabold text-xs text-[#181226] mb-1">
                    Todavía no agregaste ninguna canción
                  </p>
                  <p className="text-[11px] text-[#8E869E] max-w-xs mx-auto">
                    Usá el buscador de arriba o seleccioná un pack de prueba para empezar a armar tu Kahoot musical.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {tracks.map((track, index) => {
                    const isEditing = editingTrackIndex === index;
                    return (
                      <div
                        key={track.id || index}
                        className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] hover:border-[#CBD5E1] transition-colors flex items-center justify-between gap-3 group"
                      >
                        {/* Number & Track info */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-[#181226] text-white text-xs font-black flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>

                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={track.title}
                                  onChange={(e) => handleUpdateTrackInline(index, 'title', e.target.value)}
                                  className="px-2 py-1 bg-white border border-[#FF5722] rounded-lg text-xs font-bold text-[#181226] outline-none flex-1"
                                  placeholder="Título"
                                />
                                <input
                                  type="text"
                                  value={track.artist}
                                  onChange={(e) => handleUpdateTrackInline(index, 'artist', e.target.value)}
                                  className="px-2 py-1 bg-white border border-[#FF5722] rounded-lg text-xs font-bold text-[#181226] outline-none flex-1"
                                  placeholder="Artista"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditingTrackIndex(null)}
                                  className="px-2 py-1 rounded bg-[#FF5722] text-white text-xs font-bold cursor-pointer"
                                >
                                  OK
                                </button>
                              </div>
                            ) : (
                              <div>
                                <p className="font-extrabold text-xs text-[#181226] truncate">
                                  {track.title}
                                </p>
                                <p className="text-[11px] text-[#574F6B] truncate">
                                  {track.artist || 'Artista no especificado'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions (Reorder, Preview, Edit, Delete) */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Audio Preview Button */}
                          <button
                            type="button"
                            onClick={() => setPreviewTrack(track)}
                            className="w-7 h-7 rounded-lg bg-white border border-[#EAE3D5] flex items-center justify-center text-[#FF5722] hover:bg-[#FF5722] hover:text-white cursor-pointer transition-colors"
                            title="Escuchar prueba de audio"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>

                          {/* Edit inline */}
                          <button
                            type="button"
                            onClick={() => setEditingTrackIndex(isEditing ? null : index)}
                            className="w-7 h-7 rounded-lg bg-white border border-[#EAE3D5] flex items-center justify-center text-[#574F6B] hover:text-[#181226] cursor-pointer"
                            title="Editar nombre o artista"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          {/* Move Up */}
                          <button
                            type="button"
                            onClick={() => handleMoveTrack(index, index - 1)}
                            disabled={index === 0}
                            className="w-7 h-7 rounded-lg bg-white border border-[#EAE3D5] flex items-center justify-center text-[#574F6B] hover:text-[#181226] disabled:opacity-30 cursor-pointer"
                            title="Subir orden"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            </svg>
                          </button>

                          {/* Move Down */}
                          <button
                            type="button"
                            onClick={() => handleMoveTrack(index, index + 1)}
                            disabled={index === tracks.length - 1}
                            className="w-7 h-7 rounded-lg bg-white border border-[#EAE3D5] flex items-center justify-center text-[#574F6B] hover:text-[#181226] disabled:opacity-30 cursor-pointer"
                            title="Bajar orden"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleRemoveTrack(index)}
                            className="w-7 h-7 rounded-lg bg-white border border-[#EAE3D5] flex items-center justify-center text-[#DC2626] hover:bg-[#DC2626] hover:text-white cursor-pointer transition-colors"
                            title="Eliminar canción"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Audio Preview Modal ───────────────────────────────── */}
        <AnimatePresence>
          {previewTrack && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="party-card bg-white p-5 sm:p-6 rounded-3xl border-2 border-[#EAE3D5] max-w-md w-full shadow-2xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="badge-tag text-[#FF5722] font-black text-[10px]">
                      PROBAR AUDIO DE LA CANCIÓN
                    </span>
                    <h3 className="font-display font-black text-sm text-[#181226] truncate">
                      {previewTrack.title}
                    </h3>
                    <p className="text-xs text-[#574F6B] truncate">{previewTrack.artist}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewTrack(null)}
                    className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EAE3D5] flex items-center justify-center text-[#8E869E] hover:text-[#181226] cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="my-4 rounded-2xl overflow-hidden bg-[#181226] aspect-video flex items-center justify-center">
                  {previewYtId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${previewYtId}?autoplay=1&controls=1`}
                      title="Preview"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <audio
                      src={previewTrack.url}
                      controls
                      autoPlay
                      className="w-11/12"
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewTrack(null)}
                  className="arcade-btn w-full py-2.5 rounded-xl text-xs font-black text-[#181226] bg-[#FAF7F2] border border-[#EAE3D5] cursor-pointer"
                >
                  Cerrar Reproductor
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Success Save Modal ────────────────────────────────── */}
        <AnimatePresence>
          {savedSuccessGame && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="party-card bg-white p-6 sm:p-8 rounded-3xl border-2 border-[#EAE3D5] max-w-lg w-full text-center shadow-2xl"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669] mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <span className="badge-tag text-[#059669] font-black text-[10px] tracking-wider mb-1">
                  ¡PARTIDA GUARDADA CON ÉXITO!
                </span>

                <h3 className="font-display font-black text-xl text-[#181226] mb-1">
                  "{savedSuccessGame.title}"
                </h3>

                <p className="text-xs text-[#574F6B] mb-5">
                  Tiene <span className="font-bold text-[#181226]">{savedSuccessGame.tracks.length} canciones</span> y quedó guardada como{' '}
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                    savedSuccessGame.isPublic ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#F5F3FF] text-[#7C3AED]'
                  }`}>
                    {savedSuccessGame.isPublic ? 'Pública (visible en la biblioteca)' : 'Privada (solo vos podés jugarla)'}
                  </span>.
                </p>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => handleLaunchGame(savedSuccessGame)}
                    className="arcade-btn-primary w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Lanzar Sala de Juego Ahora (Host)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/library')}
                      className="arcade-btn py-2.5 px-3 rounded-xl text-xs font-black text-[#181226] bg-[#FAF7F2] border border-[#EAE3D5] cursor-pointer"
                    >
                      Ir a la Biblioteca
                    </button>
                    <button
                      type="button"
                      onClick={() => setSavedSuccessGame(null)}
                      className="arcade-btn py-2.5 px-3 rounded-xl text-xs font-black text-[#574F6B] hover:text-[#181226] bg-[#FAF7F2] border border-[#EAE3D5] cursor-pointer"
                    >
                      Seguir Editando
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
