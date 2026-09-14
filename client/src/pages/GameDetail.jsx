import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../socket';
import { extractYoutubeId } from '../utils/trackHelper';
import { useTranslation } from '../context/LanguageContext';
import { getLocalizedGameDescription, getLocalizedGameTitle } from '../i18n/translations';
import { getGameCoverTheme } from '../utils/genreArt';
import MusicPackCover from '../components/MusicPackCover';
import LanguageSelector from '../components/LanguageSelector';

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [antiSpoiler, setAntiSpoiler] = useState(true);
  const [previewTrack, setPreviewTrack] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const baseUrl = SERVER_URL || window.location.origin;

  useEffect(() => {
    const fetchGame = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${baseUrl}/api/games/${id}`);
        const data = await res.json();
        if (data.success && data.game) {
          setGame(data.game);
        } else {
          setError(data.error || t('gameDetail.notFound', 'Partida no encontrada'));
        }
      } catch (err) {
        console.error('Error fetching game details:', err);
        setError('Error al conectar con el servidor');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchGame();
  }, [id, baseUrl, t]);

  // Check if this game is created by the current user locally
  const isMyGame = useMemo(() => {
    if (!game) return false;
    try {
      const stored = localStorage.getItem('trivia_my_created_games');
      const myGames = stored ? JSON.parse(stored) : [];
      return myGames.some((g) => g.id === game.id);
    } catch {
      return false;
    }
  }, [game]);

  const handleStartGame = () => {
    if (!game || !game.tracks || game.tracks.length === 0) {
      alert('Esta partida no contiene canciones válidas para jugar');
      return;
    }

    setIsLaunching(true);

    // Record play count
    fetch(`${baseUrl}/api/games/${game.id}/play`, { method: 'POST' }).catch(() => {});

    // Save playlist to local storage for HostLobby
    try {
      localStorage.setItem('trivia_playlist', JSON.stringify(game.tracks));
      localStorage.setItem('trivia_current_playlist', JSON.stringify(game.tracks));
      localStorage.setItem('trivia_selected_game_id', game.id);
    } catch (e) {
      console.warn('Storage warning:', e);
    }

    // Launch directly into Host Lobby with this game preloaded
    navigate('/host', {
      state: {
        preloadedPlaylist: game.tracks,
        suggestedMode: game.gameMode || 'auto',
        gameTitle: game.title,
        directLaunch: true,
      },
    });
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const previewYtId = useMemo(() => {
    if (!previewTrack) return null;
    return extractYoutubeId(previewTrack.url);
  }, [previewTrack]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6">
        <div className="party-card bg-white p-8 rounded-3xl border-2 border-[#EAE3D5] text-center max-w-sm w-full">
          <div className="w-8 h-8 rounded-full border-3 border-[#FF5722] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="font-black text-sm text-[#181226]">{t('gameDetail.loading', 'Cargando detalles de la partida...')}</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6">
        <div className="party-card bg-white p-8 rounded-3xl border-2 border-[#EAE3D5] text-center max-w-sm w-full">
          <div className="w-10 h-10 rounded-full bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center text-[#DC2626] mx-auto mb-3 font-black">
            ✕
          </div>
          <h2 className="font-display font-black text-base text-[#181226] mb-2">{t('gameDetail.notFound', 'Partida no disponible')}</h2>
          <p className="text-xs text-[#6B6280] mb-5">{error || 'La partida solicitada no existe o fue eliminada.'}</p>
          <button
            type="button"
            onClick={() => navigate('/library')}
            className="arcade-btn-primary w-full py-2.5 rounded-xl text-xs font-black cursor-pointer"
          >
            {t('gameDetail.back', 'Volver a la Biblioteca')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EB] text-[#181226] flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col">
        {/* ── Top Bar ───────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-4 mb-6">
          <button
            type="button"
            onClick={() => navigate('/library')}
            className="arcade-btn px-3 py-1.5 rounded-xl text-xs font-bold text-[#181226] hover:text-[#FF5722] flex items-center gap-1.5 cursor-pointer bg-white border border-[#EAE3D5]"
          >
            <svg className="w-4 h-4 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{t('gameDetail.back', 'Volver')}</span>
          </button>

          <div className="flex items-center gap-2">
            <LanguageSelector />

            {isMyGame && (
              <button
                type="button"
                onClick={() => navigate(`/create?id=${game.id}`)}
                className="arcade-btn px-3 py-1.5 rounded-xl text-xs font-bold text-[#574F6B] hover:text-[#181226] bg-white border border-[#EAE3D5] flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editar</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyShareLink}
              className="arcade-btn px-3 py-1.5 rounded-xl text-xs font-bold text-[#574F6B] hover:text-[#181226] bg-white border border-[#EAE3D5] flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>{copiedLink ? t('gameDetail.copied', '¡Enlace copiado!') : t('gameDetail.share', 'Compartir')}</span>
            </button>
          </div>
        </header>

        {/* ── Game Hero Card (Kahoot-style Game Overview with Photography) ──── */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-[#DDD5C5] border-b-[6px] border-[#CCC2AF] shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            {/* Left: Photographic Cover */}
            <div className="w-full md:w-64 shrink-0">
              <MusicPackCover
                genre={game.genre}
                title={getLocalizedGameTitle(game, t)}
                gameId={game.id}
                trackCount={game.tracks?.length || 0}
                playCount={game.playCount || 0}
                size="normal"
              />
            </div>

            {/* Middle: Details */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span className="badge-tag text-[#E21B3C] font-black text-xs">
                  {(() => {
                    const theme = getGameCoverTheme(game.genre, game.title, game.id);
                    return t(`library.genreThemes.${theme.key}.label`, game.genre || 'General');
                  })()}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                  game.isPublic ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#F5F3FF] text-[#7C3AED]'
                }`}>
                  {game.isPublic ? t('library.myGames.public', 'Pública') : t('library.myGames.private', 'Privada')}
                </span>
                <span className="text-xs text-[#8E869E]">·</span>
                <span className="text-xs font-black text-[#6B6280] font-mono">
                  {game.playCount || 0} {t('library.cards.plays', 'jugadas')}
                </span>
              </div>

              <h1 className="font-display font-black text-2xl sm:text-3xl text-[#181226] tracking-tight mb-2 leading-tight">
                {getLocalizedGameTitle(game, t)}
              </h1>

              {getLocalizedGameDescription(game, t) && (
                <p className="text-xs sm:text-sm text-[#574F6B] max-w-xl leading-relaxed mb-4">
                  {getLocalizedGameDescription(game, t)}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs font-bold text-[#574F6B]">
                <div>
                  {t('gameDetail.by', 'Creado por')}: <span className="text-[#181226] font-black">{game.creatorName || t('library.cards.community', 'Comunidad')}</span>
                </div>
                <div>
                  <span className="text-[#E21B3C] font-black">{game.tracks?.length || 0} {t('gameDetail.tracks', 'canciones')}</span>
                </div>
              </div>
            </div>

            {/* Right: Big Volumetric 3D "JUGAR / START" Action Button */}
            <div className="shrink-0 flex flex-col items-center w-full md:w-auto pt-2 md:pt-0">
              <button
                type="button"
                onClick={handleStartGame}
                disabled={isLaunching}
                className="arcade-btn-ruby px-8 py-5 rounded-2xl text-base sm:text-lg font-black flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 w-full shadow-lg"
              >
                {isLaunching ? (
                  <>
                    <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>{t('gameDetail.starting', 'Iniciando...')}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>{t('gameDetail.playGame', 'JUGAR PARTIDA')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Tracklist / Preguntas Section ───────────────────────── */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-[#DDD5C5] border-b-[6px] border-[#CCC2AF] shadow-sm flex-1 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EAE3D5] mb-4">
            <div>
              <h2 className="font-display font-black text-sm uppercase tracking-wider text-[#181226] flex items-center gap-2">
                <span>{t('gameDetail.tracklist', 'Lista de Canciones')}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#181226] text-white text-xs font-black">
                  {game.tracks?.length || 0}
                </span>
              </h2>
            </div>

            {/* Anti-spoiler Toggle */}
            <div className="flex items-center gap-2 bg-[#FAF7F2] p-1 rounded-xl border border-[#EAE3D5]">
              <span className="text-[11px] font-bold text-[#574F6B] px-2">{t('gameDetail.antiSpoiler', 'Modo Anti-Spoilers')}:</span>
              <button
                type="button"
                onClick={() => setAntiSpoiler(!antiSpoiler)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                  antiSpoiler
                    ? 'bg-[#059669] text-white'
                    : 'bg-white text-[#181226] border border-[#EAE3D5]'
                }`}
              >
                {antiSpoiler ? t('library.modal.hideNames', 'Ocultar Nombres') : t('library.modal.showNames', 'Mostrar Nombres')}
              </button>
            </div>
          </div>

          {/* Songs List */}
          <div className="space-y-2.5 flex-1">
            {game.tracks?.map((track, idx) => (
              <div
                key={track.id || idx}
                className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-7 h-7 rounded-xl bg-[#181226] text-white text-xs font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-black text-sm text-[#181226] truncate ${
                        antiSpoiler ? 'blur-xs select-none' : ''
                      }`}
                    >
                      {track.title}
                    </p>
                    <p
                      className={`text-xs text-[#574F6B] truncate font-medium ${
                        antiSpoiler ? 'blur-xs select-none' : ''
                      }`}
                    >
                      {track.artist || 'Artista'}
                    </p>
                  </div>
                </div>

                {/* Preview Button */}
                <button
                  type="button"
                  onClick={() => setPreviewTrack(track)}
                  className="w-8 h-8 rounded-xl bg-white border border-[#EAE3D5] flex items-center justify-center text-[#FF5722] hover:bg-[#FF5722] hover:text-white cursor-pointer transition-colors shrink-0"
                  title={t('gameDetail.previewPlay', 'Escuchar preview')}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Audio Preview Modal ───────────────────────────────── */}
        {previewTrack && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="party-card bg-white p-5 sm:p-6 rounded-3xl border-2 border-[#EAE3D5] max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <div>
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
                  <audio src={previewTrack.url} controls autoPlay className="w-11/12" />
                )}
              </div>

              <button
                type="button"
                onClick={() => setPreviewTrack(null)}
                className="arcade-btn w-full py-2.5 rounded-xl text-xs font-black text-[#181226] bg-[#FAF7F2] border border-[#EAE3D5] cursor-pointer"
              >
                {t('library.modal.close', 'Cerrar')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
