import { useState, useEffect, useMemo } from 'react';
import socket, { SERVER_URL } from '../socket';
import DjBotModal from './DjBotModal';
import PlaylistLoadingModal from './PlaylistLoadingModal';
import {
  saveAudioFile,
  deleteAudioFile,
  clearAudioFiles,
  createTrackObjectUrl,
  revokeTrackObjectUrl,
  hydratePlaylistTracks,
} from '../utils/audioStorage';
import { normalizeTrack, getTrackTitle } from '../utils/trackHelper';

const SAVED_PLAYLISTS_KEY = 'trivia_saved_playlists';

export default function PlaylistSetup({
  playlist,
  setPlaylist,
  savePlaylistToStorage,
  antiSpoiler,
  setAntiSpoiler,
  currentTheme,
  roomCode,
  onBack,
  onContinue,
}) {
  // ── Tabs: 'saved' | 'search' | 'local' | 'urls' ────────────
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVED_PLAYLISTS_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? 'saved' : 'search';
    } catch {
      return 'search';
    }
  });

  // ── Saved Playlists State ─────────────────────────────────
  const [savedPlaylists, setSavedPlaylists] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVED_PLAYLISTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);
  const [savePlaylistName, setSavePlaylistName] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [playlistToDelete, setPlaylistToDelete] = useState(null);

  // ── Search State ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);

  // ── URLs / Text Import State ──────────────────────────────
  const [playlistInput, setPlaylistInput] = useState('');
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);

  // ── Modals State ──────────────────────────────────────────
  const [isDjBotOpen, setIsDjBotOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ── Persist Saved Playlists ───────────────────────────────
  const persistSavedPlaylists = (newList) => {
    setSavedPlaylists(newList);
    try {
      localStorage.setItem(SAVED_PLAYLISTS_KEY, JSON.stringify(newList));
    } catch (e) {
      console.warn('Error saving playlists to localStorage:', e);
    }
  };

  const handleSaveCurrentPlaylist = (e) => {
    e.preventDefault();
    const name = savePlaylistName.trim();
    if (!name || playlist.length === 0) return;

    const newEntry = {
      id: `saved_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      createdAt: new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      tracks: playlist.map((t) => ({
        id: t.id,
        type: t.type,
        name: t.name || t.title,
        title: t.title || t.name,
        author: t.author || '',
        url: t.type === 'local' ? '' : t.url,
        size: t.size,
        fileId: t.fileId || t.id,
        thumbnail: t.thumbnail,
        duration: t.duration,
      })),
    };

    const updated = [newEntry, ...savedPlaylists];
    persistSavedPlaylists(updated);
    setSavePlaylistName('');
    setIsSavingCurrent(false);
    setSaveSuccessMsg(`¡"${name}" guardada con éxito!`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleLoadSavedPlaylist = async (savedItem) => {
    if (!savedItem || !savedItem.tracks) return;
    const hydrated = await hydratePlaylistTracks(savedItem.tracks);
    setPlaylist(hydrated);
    savePlaylistToStorage(hydrated);
    setSaveSuccessMsg(`Cargada: "${savedItem.name}" (${hydrated.length} canciones)`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleDeleteSavedPlaylist = (id) => {
    const updated = savedPlaylists.filter((p) => p.id !== id);
    persistSavedPlaylists(updated);
    setPlaylistToDelete(null);
  };

  // ── Live Debounced Search ─────────────────────────────────
  const executeSearch = async (query, signal) => {
    const q = (query || '').trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setSearchError('');
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      const serverEndpoint = SERVER_URL || socket.io?.uri || window.location.origin;
      const res = await fetch(`${serverEndpoint}/api/search-songs?q=${encodeURIComponent(q)}`, {
        signal,
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
        setSearchError(data.error || 'No se encontraron sugerencias para esta búsqueda');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Search error:', err);
        setSearchError('Error de red al conectar con el servidor para buscar canciones');
      }
    } finally {
      if (!signal?.aborted) {
        setIsSearching(false);
      }
    }
  };

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setSearchError('');
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      executeSearch(q, controller.signal);
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleAddSearchResult = (song) => {
    const track = {
      type: 'youtube',
      id: song.id,
      name: song.title,
      title: song.title,
      url: song.url,
      thumbnail: song.thumbnail,
      duration: song.duration,
      author: song.author,
    };
    const updated = [...playlist, track];
    setPlaylist(updated);
    savePlaylistToStorage(updated);
    setRecentlyAddedId(song.id);
    setTimeout(() => {
      setRecentlyAddedId((curr) => (curr === song.id ? null : curr));
    }, 2000);
  };

  // ── Upload Local Audio Files ───────────────────────────────
  const handleUploadLocalFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files || files.length === 0) return;

    const newTracks = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `local_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
      await saveAudioFile(fileId, file);
      const url = createTrackObjectUrl(fileId, file);
      newTracks.push({
        id: fileId,
        type: 'local',
        name: file.name,
        title: file.name,
        url,
        size: file.size,
        fileId,
      });
    }

    const updated = [...playlist, ...newTracks];
    setPlaylist(updated);
    savePlaylistToStorage(updated);
    e.target.value = '';
  };

  // ── Import URLs / Lists ───────────────────────────────────
  const handleAddPlaylistUrls = async () => {
    const rawInput = playlistInput.trim();
    if (!rawInput) return;
    const lines = rawInput
      .split(/[\n,]+/)
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter((s) => s.length > 3);

    if (lines.length === 0) return;

    const isSinglePlaylistUrl =
      lines.length === 1 &&
      (lines[0].includes('list=') ||
        lines[0].includes('/playlist') ||
        /^[a-zA-Z0-9_-]{18,}$/.test(lines[0]));
    const isTextList =
      !isSinglePlaylistUrl && !lines.some((l) => l.startsWith('http://') || l.startsWith('https://'));

    if (isSinglePlaylistUrl || isTextList) {
      setIsLoadingPlaylist(true);
      try {
        const serverEndpoint = SERVER_URL || socket.io?.uri || window.location.origin;
        const bodyData = isSinglePlaylistUrl ? { url: lines[0] } : { queries: lines };

        const res = await fetch(`${serverEndpoint}/api/playlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });
        const data = await res.json();

        if (data.success && data.videos && data.videos.length > 0) {
          const newTracks = data.videos.map((v) => ({
            type: 'youtube',
            id: v.id,
            name: v.title,
            title: v.title,
            url: v.url,
          }));
          const updated = [...playlist, ...newTracks];
          setPlaylist(updated);
          savePlaylistToStorage(updated);
          setPlaylistInput('');

          if (isSinglePlaylistUrl) {
            setAntiSpoiler(true);
            localStorage.setItem('trivia_anti_spoiler', 'true');
          }
        } else {
          alert(data.error || 'No se pudieron cargar las canciones de la playlist.');
        }
      } catch (e) {
        alert('Error de red al conectar con el servidor para procesar las canciones');
      } finally {
        setIsLoadingPlaylist(false);
      }
      return;
    }

    const newTracks = lines.map((url) => normalizeTrack(url));
    const updated = [...playlist, ...newTracks];
    setPlaylist(updated);
    savePlaylistToStorage(updated);
    setPlaylistInput('');
  };

  // ── Remove Single Track ───────────────────────────────────
  const handleRemovePlaylistItem = async (index) => {
    const itemToRemove = playlist[index];
    if (itemToRemove && typeof itemToRemove === 'object' && itemToRemove.fileId) {
      await deleteAudioFile(itemToRemove.fileId);
      revokeTrackObjectUrl(itemToRemove.fileId);
    }
    const updated = playlist.filter((_, idx) => idx !== index);
    setPlaylist(updated);
    savePlaylistToStorage(updated);
  };

  // ── Clear Current Playlist ────────────────────────────────
  const handleClearPlaylist = () => {
    setPlaylist([]);
    try {
      localStorage.removeItem('trivia_playlist');
    } catch {
      /* ignore */
    }
    clearAudioFiles().catch((e) => console.warn('Error clearing audio files:', e));
    setShowClearConfirm(false);
  };

  // ── DJ Bot Generator Callback ─────────────────────────────
  const handleDjBotGenerated = (generatedPlaylist) => {
    const updated = [...playlist, ...generatedPlaylist];
    setPlaylist(updated);
    savePlaylistToStorage(updated);
    setAntiSpoiler(true);
    try {
      localStorage.setItem('trivia_anti_spoiler', 'true');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="h-screen max-h-screen p-3 sm:p-4 flex flex-col text-[var(--color-text-primary)] relative overflow-hidden">
      {/* Dynamic ambient color glow matching current mode */}
      <div
        className="absolute top-[-10%] left-[20%] w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-15 transition-all duration-700"
        style={{ backgroundColor: currentTheme?.color || '#FF5722' }}
      />
      <div
        className="absolute bottom-[-10%] right-[20%] w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-15 transition-all duration-700"
        style={{ backgroundColor: currentTheme?.color || '#FF5722' }}
      />

      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col min-h-0 relative z-10">
        {/* ── Top Header Navigation Bar ────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 mb-2.5 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onBack}
              className="arcade-btn px-3 py-1.5 rounded-xl text-xs font-bold text-[#181226] hover:text-[#FF5722] flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Cambiar Modo</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#DDD5C5] text-[#6B6280]">
                Paso 2 de 3
              </span>
              <h1 className="font-display font-black text-sm sm:text-base text-[#181226] tracking-tight">
                Carga y Selección de Playlist
              </h1>
            </div>

            {roomCode && (
              <div className="px-2.5 py-1 rounded-xl bg-white border border-[#DDD5C5] font-mono text-xs font-black text-[#181226] shadow-2xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#059669]" />
                <span>SALA {roomCode}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDjBotOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#FF5722] hover:bg-[#E64A19] text-white text-xs font-black shadow-xs active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>DJ Bot Automático</span>
            </button>

            <button
              type="button"
              onClick={onContinue}
              className="arcade-btn-primary px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-sm active:scale-98 transition-all"
            >
              <span>Continuar al Lobby ({playlist.length})</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Success / Info Toast */}
        {saveSuccessMsg && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-[#E6F9F0] border border-[#059669]/40 text-[#059669] text-xs font-bold flex items-center justify-between animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{saveSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessMsg('')}
              className="text-[#059669] hover:text-[#065F46] p-0.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Main 2-Column Console Layout (Zero Scroll) ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 items-stretch overflow-hidden">
          {/* LEFT COLUMN: Tools & Tabs (7 cols) */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-0 party-card p-3 sm:p-4 rounded-2xl shadow-sm">
            {/* Tabs Bar */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#FAF7F2] rounded-xl border border-[#EAE3D5] shrink-0 mb-3">
              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'saved'
                    ? 'bg-[#FF5722] text-white shadow-xs'
                    : 'text-[#6B6280] hover:text-[#181226]'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span className="truncate">Mis Playlists</span>
                {savedPlaylists.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      activeTab === 'saved'
                        ? 'bg-white text-[#FF5722]'
                        : 'bg-[#FF5722]/15 text-[#FF5722]'
                    }`}
                  >
                    {savedPlaylists.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'search'
                    ? 'bg-[#FF5722] text-white shadow-xs'
                    : 'text-[#6B6280] hover:text-[#181226]'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="truncate">Buscador</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('local')}
                className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'local'
                    ? 'bg-[#059669] text-white shadow-xs'
                    : 'text-[#6B6280] hover:text-[#181226]'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="truncate">Archivos PC</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('urls')}
                className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'urls'
                    ? 'bg-[#181226] text-white shadow-xs'
                    : 'text-[#6B6280] hover:text-[#181226]'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="truncate">Pegar Links</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* ── TAB 1: Mis Playlists Guardadas ─────────────────── */}
              {activeTab === 'saved' && (
                <div className="flex-1 min-h-0 flex flex-col space-y-2.5">
                  <div className="flex items-center justify-between shrink-0 px-1">
                    <div>
                      <h3 className="font-display font-black text-xs sm:text-sm text-[#181226]">
                        Playlists Guardadas en este Navegador
                      </h3>
                      <p className="text-[11px] text-[#6B6280]">
                        Seleccioná una lista previa para cargarla al instante sin volver a buscar.
                      </p>
                    </div>

                    {playlist.length > 0 && !isSavingCurrent && (
                      <button
                        type="button"
                        onClick={() => setIsSavingCurrent(true)}
                        className="px-2.5 py-1 rounded-xl bg-[#FFF0EB] border border-[#FF5722]/30 text-[#FF5722] hover:bg-[#FFE5DC] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        <span>Guardar actual ({playlist.length})</span>
                      </button>
                    )}
                  </div>

                  {/* Inline Save Form */}
                  {isSavingCurrent && (
                    <form
                      onSubmit={handleSaveCurrentPlaylist}
                      className="p-3 bg-[#FFF8F5] border-2 border-[#FF5722]/40 rounded-xl flex items-center gap-2 animate-fade-in shrink-0"
                    >
                      <input
                        type="text"
                        value={savePlaylistName}
                        onChange={(e) => setSavePlaylistName(e.target.value)}
                        placeholder="Nombre de la playlist (ej. Rock Nacional, Cumple Alma...)"
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#EAE3D5] rounded-lg focus:outline-none focus:border-[#FF5722] text-[#181226]"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!savePlaylistName.trim()}
                        className="arcade-btn-primary px-3 py-1.5 text-xs font-black text-white shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSavingCurrent(false);
                          setSavePlaylistName('');
                        }}
                        className="px-2.5 py-1.5 text-xs font-bold text-[#6B6280] hover:text-[#181226] cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </form>
                  )}

                  {/* List of saved playlists */}
                  {savedPlaylists.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-[#FAF7F2] rounded-xl border border-[#EAE3D5]">
                      <div className="w-12 h-12 rounded-xl bg-[#FFF0EB] text-[#FF5722] flex items-center justify-center mb-2 shadow-2xs">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <h4 className="font-display font-black text-xs sm:text-sm text-[#181226] mb-1">
                        Aún no tenés playlists guardadas
                      </h4>
                      <p className="text-[11px] text-[#6B6280] max-w-xs mb-3 leading-snug">
                        Podés armar una lista con el buscador o el DJ Bot y guardarla con el botón "Guardar actual".
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('search')}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#DDD5C5] hover:border-[#FF5722] text-[#181226] text-xs font-black shadow-2xs hover:bg-[#FAF7F2] cursor-pointer"
                      >
                        Ir al Buscador de Canciones →
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {savedPlaylists.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-[#EAE3D5] hover:border-[#FF5722]/50 transition-all shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-lg bg-[#FAF7F2] border border-[#EAE3D5] flex items-center justify-center text-[#FF5722] shrink-0">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs text-[#181226] truncate">{item.name}</p>
                              <div className="flex items-center gap-2 text-[10px] text-[#6B6280] mt-0.5">
                                <span className="font-black text-[#FF5722]">{item.tracks?.length || 0} canciones</span>
                                <span>·</span>
                                <span>{item.createdAt || 'Guardada'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleLoadSavedPlaylist(item)}
                              className="px-3 py-1.5 rounded-lg bg-[#FF5722] hover:bg-[#E64A19] text-white text-xs font-black shadow-xs cursor-pointer active:scale-98 transition-all"
                            >
                              Usar Playlist
                            </button>
                            <button
                              type="button"
                              onClick={() => setPlaylistToDelete(item)}
                              className="text-[#8E869E] hover:text-[#E11D48] hover:bg-[#FFF0F3] p-1.5 rounded-lg cursor-pointer transition-colors"
                              title="Eliminar playlist guardada"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: Buscador en vivo ───────────────────────── */}
              {activeTab === 'search' && (
                <div className="flex-1 min-h-0 flex flex-col space-y-2.5">
                  <form onSubmit={(e) => { e.preventDefault(); executeSearch(searchQuery); }} className="flex gap-2 shrink-0">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Escribí canción o artista (ej. De Música Ligera, Charly García...)"
                        className="w-full bg-white border border-[#E0D9CB] rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm font-semibold text-[#181226] focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] outline-none shadow-inner"
                        autoFocus
                      />
                      <svg className="w-4 h-4 text-[#8E869E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>

                      {isSearching ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <svg className="w-4 h-4 text-[#FF5722] animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                      ) : searchQuery ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                            setSearchError('');
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E869E] hover:text-[#181226] p-0.5 rounded-full cursor-pointer"
                        >
                          ✕
                        </button>
                      ) : null}
                    </div>

                    <button
                      type="submit"
                      disabled={!searchQuery.trim() || isSearching}
                      className="arcade-btn-primary px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <span>Buscar</span>
                    </button>
                  </form>

                  {searchResults.length > 0 && (
                    <div className="flex items-center justify-between text-xs font-bold text-[#6B6280] px-1 shrink-0">
                      <span>Sugerencias en tiempo real ({searchResults.length})</span>
                      <span className="text-[10px] text-[#8E869E]">Clic en "+ Agregar" para sumar a la lista</span>
                    </div>
                  )}

                  {searchError && (
                    <p className="text-xs text-[#E11D48] font-bold bg-[#FFF0F3] p-2 rounded-xl border border-[#E11D48]/30 shrink-0">
                      {searchError}
                    </p>
                  )}

                  {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && !searchError && (
                    <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EAE3D5] text-center shrink-0">
                      <p className="text-xs font-bold text-[#181226]">No se encontraron canciones para "{searchQuery}"</p>
                      <p className="text-[11px] text-[#6B6280] mt-0.5">Probá con otro término, artista o pegá el link directo</p>
                    </div>
                  )}

                  {/* Results List */}
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {searchResults.length === 0 && !searchQuery && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#6B6280]">
                        <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] flex items-center justify-center text-[#FF5722] mb-2 shadow-2xs">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <p className="font-bold text-xs text-[#181226]">Buscá cualquier canción o artista</p>
                        <p className="text-[11px] max-w-xs mt-0.5">
                          Escribí arriba para obtener resultados al instante y agregarlos con un solo clic.
                        </p>
                      </div>
                    )}

                    {searchResults.map((song) => {
                      const isAdded = playlist.some(
                        (p) =>
                          (typeof p === 'object' && p.id === song.id) ||
                          (typeof p === 'string' && p.includes(song.id))
                      );
                      const wasJustAdded = recentlyAddedId === song.id;

                      return (
                        <div
                          key={song.id}
                          className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white border border-[#EAE3D5] hover:border-[#FF5722]/50 transition-all shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {song.thumbnail ? (
                              <div className="relative w-12 h-9 rounded-lg overflow-hidden shrink-0 bg-black/10">
                                <img
                                  src={song.thumbnail}
                                  alt={song.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                                {song.duration > 0 && (
                                  <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[9px] font-bold px-1 rounded">
                                    {Math.floor(song.duration / 60)}:
                                    {String(song.duration % 60).padStart(2, '0')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="w-10 h-9 rounded-lg bg-[#FFF0EB] flex items-center justify-center text-[#FF5722] shrink-0">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs text-[#181226] truncate leading-tight" title={song.title}>
                                {song.title}
                              </p>
                              <p className="text-[11px] text-[#6B6280] truncate mt-0.5">
                                {song.author || 'YouTube'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddSearchResult(song)}
                            disabled={wasJustAdded}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer ${
                              wasJustAdded
                                ? 'bg-[#E6F9F0] text-[#059669] border border-[#059669]/30'
                                : isAdded
                                ? 'bg-[#FAF7F2] text-[#6B6280] border border-[#EAE3D5] hover:bg-[#FFF0EB] hover:text-[#FF5722]'
                                : 'arcade-btn-primary text-white shadow-xs'
                            }`}
                          >
                            {wasJustAdded ? '¡Agregada!' : isAdded ? '+ Otra vez' : '+ Agregar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── TAB 3: Archivos Locales ───────────────────────── */}
              {activeTab === 'local' && (
                <div className="flex-1 flex flex-col justify-center">
                  <label className="border-2 border-dashed border-[#DDD5C5] hover:border-[#059669] bg-[#FAF7F2] hover:bg-[#F3EFE6] p-6 sm:p-8 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all text-center group">
                    <div className="w-14 h-14 rounded-2xl bg-[#E6F9F0] border border-[#059669]/30 flex items-center justify-center text-[#059669] mb-3 group-hover:scale-105 transition-transform shadow-xs">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <p className="font-display text-sm sm:text-base font-black text-[#181226] mb-1">
                      Hacé clic para seleccionar tus canciones (.mp3, .wav, .m4a)
                    </p>
                    <p className="text-xs text-[#6B6280] max-w-sm leading-relaxed mb-3">
                      Podés seleccionar varios archivos juntos desde tu disco. Se guardan localmente para jugar sin conexión a internet.
                    </p>
                    <span className="arcade-btn-mint px-4 py-2 rounded-xl text-xs font-black shadow-xs">
                      Examinar Archivos
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                      onChange={handleUploadLocalFiles}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* ── TAB 4: Pegar URLs ─────────────────────────────── */}
              {activeTab === 'urls' && (
                <div className="flex-1 flex flex-col justify-center space-y-3">
                  <div className="space-y-1">
                    <p className="font-display font-black text-xs sm:text-sm text-[#181226]">
                      Pegá links de YouTube o nombres de temas
                    </p>
                    <p className="text-[11px] text-[#6B6280]">
                      Acepta enlaces individuales, links de playlists de YouTube, o una lista de títulos separados por línea.
                    </p>
                  </div>

                  <textarea
                    value={playlistInput}
                    onChange={(e) => setPlaylistInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddPlaylistUrls();
                      }
                    }}
                    placeholder="https://www.youtube.com/watch?v=... o https://youtube.com/playlist?list=..."
                    className="w-full bg-white border border-[#E0D9CB] rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold text-[#181226] focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] outline-none shadow-inner resize-none flex-1 min-h-[120px]"
                    rows={4}
                  />

                  <button
                    onClick={handleAddPlaylistUrls}
                    disabled={!playlistInput.trim() || isLoadingPlaylist}
                    className="w-full arcade-btn-primary py-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingPlaylist ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Cargando canciones...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Agregar Links a la Lista</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Current Playlist Roster (5 cols) */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-0 party-card p-3 sm:p-4 rounded-2xl shadow-sm">
            {/* Header Strip */}
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#EAE3D5] shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-black uppercase tracking-wider text-[#181226]">
                  Canciones en Partida
                </span>
                <span className="mono text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[#FF5722] border border-[#FF5722]/30 shrink-0">
                  {playlist.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {playlist.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('saved');
                        setIsSavingCurrent(true);
                      }}
                      className="h-7 px-2 rounded-lg text-[10px] font-black bg-[#FAF7F2] hover:bg-[#FFF0EB] text-[#FF5722] border border-[#FF5722]/30 transition-all cursor-pointer inline-flex items-center gap-1"
                      title="Guardar esta lista"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      <span>Guardar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      className="h-7 px-2 rounded-lg text-[10px] font-bold text-[#E11D48] hover:bg-[#FFF0F3] border border-[#E11D48]/30 transition-all cursor-pointer inline-flex items-center gap-1"
                      title="Borrar todas las canciones"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Vaciar</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const next = !antiSpoiler;
                    setAntiSpoiler(next);
                    localStorage.setItem('trivia_anti_spoiler', next ? 'true' : 'false');
                  }}
                  className={`h-7 px-2 rounded-lg text-[10px] font-black border transition-all flex items-center gap-1 cursor-pointer ${
                    antiSpoiler
                      ? 'bg-[#FFF0EB] text-[#FF5722] border-[#FF5722]/40 shadow-xs'
                      : 'bg-[#FAF7F2] text-[#6B6280] border-[#EAE3D5] hover:text-[#181226]'
                  }`}
                  title={antiSpoiler ? 'Títulos protegidos contra spoilers' : 'Ocultar títulos para no saber las respuestas'}
                >
                  {antiSpoiler ? (
                    <>
                      <svg className="w-3 h-3 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                      <span>Anti-Spoiler</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Anti-Spoiler</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* List or Empty State */}
            {playlist.length === 0 ? (
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-4 bg-[#FAF7F2] rounded-xl border border-[#EAE3D5] my-auto">
                <div className="relative mb-2.5 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-[#181226] border-4 border-[#2E2445] shadow-md flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-1.5 rounded-full border border-white/10" />
                    <div className="absolute inset-3 rounded-full border border-white/10" />
                    <div className="w-6 h-6 rounded-full bg-[#FF5722] flex items-center justify-center shadow-inner">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1.5 w-6 h-1 bg-[#8E869E] rounded-full rotate-45 origin-left" />
                </div>

                <h4 className="font-display font-black text-sm text-[#181226] mb-0.5">
                  Tocadiscos en silencio
                </h4>
                <p className="text-[11px] text-[#6B6280] max-w-xs mb-3 leading-snug">
                  Elegí una playlist guardada, creá una con el DJ Bot o agregá canciones con el buscador.
                </p>

                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => setIsDjBotOpen(true)}
                    className="py-2 px-3 rounded-xl bg-[#FF5722] hover:bg-[#E64A19] text-white text-xs font-black shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Crear con DJ Bot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('search')}
                    className="py-2 px-3 rounded-xl bg-white border border-[#DDD5C5] hover:border-[#FF5722] text-[#181226] text-xs font-bold shadow-2xs hover:bg-[#FAF7F2] transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Buscar Canciones Manualmente</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col space-y-2 pr-1">
                <div className="console-inset p-2.5 rounded-xl flex-1 min-h-0 overflow-y-auto space-y-1.5 custom-scrollbar">
                  {playlist.map((track, idx) => {
                    const isLocal = typeof track === 'object' && track.type === 'local';
                    const title = getTrackTitle(track);
                    const sizeTxt =
                      typeof track === 'object' && track.size
                        ? ` (${(track.size / (1024 * 1024)).toFixed(1)} MB)`
                        : '';

                    return (
                      <div
                        key={track.id || idx}
                        className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl bg-white border border-[#EAE3D5] shadow-2xs gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="mono text-[10px] font-black text-[#6B6280] shrink-0">
                            #{idx + 1}
                          </span>

                          {isLocal ? (
                            <span className="badge-tag bg-[#E6F9F0] text-[#059669] border border-[#059669]/40 px-1.5 py-0.2 rounded text-[9px] shrink-0 font-black">
                              LOCAL
                            </span>
                          ) : (
                            <span className="badge-tag bg-[#FFF0EB] text-[#FF5722] border border-[#FF5722]/30 px-1.5 py-0.2 rounded text-[9px] shrink-0 font-black">
                              URL
                            </span>
                          )}

                          <span
                            className={`truncate font-bold text-xs ${
                              antiSpoiler
                                ? 'filter blur-[5px] select-none hover:blur-none transition-all duration-200 cursor-pointer text-[#8E869E]'
                                : 'text-[#181226]'
                            }`}
                            title={
                              antiSpoiler
                                ? 'Pista protegida contra spoilers. Posá el cursor para ver el título.'
                                : title
                            }
                          >
                            {antiSpoiler ? `•••••••••••••••••••• (Pista #${idx + 1})` : title}
                            {!antiSpoiler && sizeTxt && (
                              <span className="mono text-[10px] text-[#6B6280] font-normal">{sizeTxt}</span>
                            )}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePlaylistItem(idx)}
                          className="text-[#8E869E] hover:text-[#E11D48] hover:bg-[#FFF0F3] p-1 rounded-lg shrink-0 cursor-pointer transition-colors"
                          title="Eliminar canción"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Mini Summary Footer */}
                <div className="flex items-center justify-between text-[11px] text-[#6B6280] pt-1 px-1 shrink-0">
                  <span>
                    {playlist.filter((t) => typeof t === 'object' && t.type === 'local').length} locales ·{' '}
                    {playlist.filter((t) => (typeof t === 'string' ? true : t.type !== 'local')).length} web
                  </span>
                  <span className="font-bold text-[#181226]">Total: {playlist.length} canciones</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DJ Bot Modal */}
      <DjBotModal
        isOpen={isDjBotOpen}
        onClose={() => setIsDjBotOpen(false)}
        onPlaylistGenerated={handleDjBotGenerated}
        existingPlaylist={playlist}
        serverUrl={SERVER_URL}
      />

      {/* Playlist Loading Modal */}
      <PlaylistLoadingModal
        isOpen={isLoadingPlaylist}
        tag="PROCESANDO PLAYLIST"
        title="Cargando Canciones"
        subtitle="Buscando las pistas en YouTube y organizando la lista sin spoilers."
      />

      {/* Confirmation Modal to Clear Playlist */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E0A16]/80 animate-fade-in select-none"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="party-card p-6 sm:p-8 max-w-md w-full rounded-[2rem] bg-white border-2 border-[#EAE3D5] text-center shadow-2xl animate-fade-in text-[#181226]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] border-2 border-[#E11D48]/30 flex items-center justify-center mx-auto mb-4 text-[#E11D48] shadow-xs">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <p className="badge-tag text-[#E11D48] mb-1">VACIAR PLAYLIST</p>
            <h3 className="font-display text-xl sm:text-2xl font-black text-[#181226] tracking-tight mb-2">
              ¿Eliminar todas las canciones?
            </h3>
            <p className="text-xs sm:text-sm text-[#6B6280] font-medium leading-relaxed mb-6">
              Se quitarán las {playlist.length} canciones cargadas actualmente para armar una lista nueva desde cero.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-[#EAE3D5] text-xs sm:text-sm font-bold text-[#6B6280] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearPlaylist}
                className="flex-1 py-3 px-4 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs sm:text-sm font-black transition-all cursor-pointer shadow-xs"
              >
                Sí, borrar todas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Delete Saved Playlist */}
      {playlistToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E0A16]/80 animate-fade-in select-none"
          onClick={() => setPlaylistToDelete(null)}
        >
          <div
            className="party-card p-6 sm:p-8 max-w-md w-full rounded-[2rem] bg-white border-2 border-[#EAE3D5] text-center shadow-2xl animate-fade-in text-[#181226]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] border-2 border-[#E11D48]/30 flex items-center justify-center mx-auto mb-4 text-[#E11D48] shadow-xs">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <p className="badge-tag text-[#E11D48] mb-1">ELIMINAR PLAYLIST</p>
            <h3 className="font-display text-xl sm:text-2xl font-black text-[#181226] tracking-tight mb-2">
              ¿Eliminar "{playlistToDelete.name}"?
            </h3>
            <p className="text-xs sm:text-sm text-[#6B6280] font-medium leading-relaxed mb-6">
              Esta playlist guardada ({playlistToDelete.tracks?.length || 0} canciones) se eliminará de tus listas rápidas de este navegador.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPlaylistToDelete(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-[#EAE3D5] text-xs sm:text-sm font-bold text-[#6B6280] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSavedPlaylist(playlistToDelete.id)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs sm:text-sm font-black transition-all cursor-pointer shadow-xs"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
