import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import socket from '../socket';

function extractYoutubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

function extractSpotifyEmbed(url) {
  if (!url) return null;
  const match = url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
  return null;
}

export default function MusicPlayer({ roomCode, playlist = [] }) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [url, setUrl] = useState('');
  const [mediaType, setMediaType] = useState(null);
  const [mediaId, setMediaId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playDuration, setPlayDuration] = useState(15);
  const [startTime, setStartTime] = useState(0);
  const [showManualInput, setShowManualInput] = useState(false);

  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const ytPlayerRef = useRef(null);

  // Load YouTube IFrame API once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript.parentNode.insertBefore(tag, firstScript);
    }
  }, []);

  const loadMedia = useCallback((inputUrl) => {
    const trimmed = (inputUrl || '').trim();
    if (!trimmed) {
      setMediaType(null);
      setMediaId(null);
      return;
    }

    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch (e) { /* */ }
      ytPlayerRef.current = null;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(false);

    const ytId = extractYoutubeId(trimmed);
    if (ytId) {
      setMediaType('youtube');
      setMediaId(ytId);
      setTimeout(() => initYoutubePlayer(ytId), 100);
      return;
    }

    const spotifyEmbed = extractSpotifyEmbed(trimmed);
    if (spotifyEmbed) {
      setMediaType('spotify');
      setMediaId(spotifyEmbed);
      return;
    }

    setMediaType(null);
    setMediaId(null);
  }, []);

  // Initialize from playlist when playlist is provided
  useEffect(() => {
    if (playlist && playlist.length > 0) {
      const trackUrl = playlist[currentTrackIndex] || playlist[0];
      setUrl(trackUrl);
      loadMedia(trackUrl);
    }
  }, [playlist, currentTrackIndex, loadMedia]);

  const initYoutubePlayer = useCallback((videoId) => {
    const checkAndInit = () => {
      if (window.YT && window.YT.Player) {
        const container = document.getElementById('yt-player');
        if (container) container.innerHTML = '';

        ytPlayerRef.current = new window.YT.Player('yt-player', {
          height: '100%',
          width: '100%',
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            fs: 0,
            start: startTime,
          },
          events: { onReady: () => {} },
        });
      } else {
        setTimeout(checkAndInit, 200);
      }
    };
    checkAndInit();
  }, [startTime]);

  const handleNextTrack = () => {
    if (!playlist || playlist.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(nextIdx);
    const nextUrl = playlist[nextIdx];
    setUrl(nextUrl);
    loadMedia(nextUrl);
  };

  const handlePrevTrack = () => {
    if (!playlist || playlist.length === 0) return;
    const prevIdx = currentTrackIndex === 0 ? playlist.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(prevIdx);
    const prevUrl = playlist[prevIdx];
    setUrl(prevUrl);
    loadMedia(prevUrl);
  };

  const handlePlay = useCallback(() => {
    if (mediaType === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(startTime, true);
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          try { ytPlayerRef.current?.pauseVideo(); } catch (e) { /* */ }
          setIsPlaying(false);
        }, playDuration * 1000);
      } catch (e) { console.error('Play error:', e); }
    }
    socket.emit('music-control', { roomCode, action: 'play', data: { duration: playDuration, startTime } });
  }, [mediaType, playDuration, startTime, roomCode]);

  const handlePause = useCallback(() => {
    if (mediaType === 'youtube' && ytPlayerRef.current) {
      try { ytPlayerRef.current.pauseVideo(); } catch (e) { /* */ }
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(false);
    socket.emit('music-control', { roomCode, action: 'pause' });
  }, [mediaType, roomCode]);

  const handleStop = useCallback(() => {
    if (mediaType === 'youtube' && ytPlayerRef.current) {
      try { ytPlayerRef.current.stopVideo(); } catch (e) { /* */ }
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(false);
    socket.emit('music-control', { roomCode, action: 'stop' });
  }, [mediaType, roomCode]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy(); } catch (e) { /* */ } }
    };
  }, []);

  const hasPlaylist = playlist && playlist.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="nm-flat p-5 sm:p-6 rounded-2xl"
    >
      {/* Header bar: Track counter or manual toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="label">Reproductor de Música</span>
          {hasPlaylist && (
            <div className="flex items-center gap-2 mt-1">
              <span className="mono text-xs font-bold text-[var(--color-accent)] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Canción {currentTrackIndex + 1} de {playlist.length}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
        >
          {showManualInput ? 'Ocultar URL manual' : 'Cargar URL manual'}
        </button>
      </div>

      {/* Playlist Queue Controller (Requirement 2) */}
      {hasPlaylist && (
        <div className="nm-inset p-3 rounded-xl mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="mono text-xs text-[var(--color-text-secondary)] truncate">
              {url || 'Cargando pista...'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrevTrack}
              title="Canción anterior"
              className="nm-btn p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <button
              onClick={handleNextTrack}
              className="nm-btn-primary px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
              title="Avanzar a la siguiente canción de la lista"
            >
              <span>Siguiente Canción</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Optional Manual URL input */}
      {(!hasPlaylist || showManualInput) && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadMedia(url)}
            placeholder="Pegá URL de YouTube o Spotify"
            className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm"
          />
          <button
            onClick={() => loadMedia(url)}
            className="nm-btn px-4 py-2.5 font-bold text-xs shrink-0"
          >
            Cargar
          </button>
        </div>
      )}

      {/* Playback Settings (Duración e Inicio) */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="label">Duración</span>
          <div className="flex gap-1.5">
            {[10, 15, 30].map((sec) => (
              <button
                key={sec}
                onClick={() => setPlayDuration(sec)}
                className={`mono px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  playDuration === sec
                    ? 'nm-inset text-[var(--color-accent)] font-extrabold'
                    : 'nm-btn text-[var(--color-text-muted)]'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="label">Desde</span>
          <input
            type="number"
            value={startTime}
            onChange={(e) => setStartTime(Math.max(0, parseInt(e.target.value) || 0))}
            min="0"
            className="mono w-14 px-2 py-1 text-xs text-center"
          />
          <span className="text-[11px] text-[var(--color-text-muted)]">seg</span>
        </div>
      </div>

      {/* Video Container (embedded with sunken well) */}
      {mediaType === 'youtube' && (
        <div className="nm-inset p-2 rounded-xl overflow-hidden mb-4">
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            <div id="yt-player" ref={playerRef} className="w-full h-full" />
            <div className="absolute inset-0 z-10 pointer-events-none" />
          </div>
        </div>
      )}

      {mediaType === 'spotify' && mediaId && (
        <div className="nm-inset p-2 rounded-xl overflow-hidden mb-4">
          <iframe
            src={mediaId}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-lg"
          />
        </div>
      )}

      {!mediaType && url.trim() && (
        <div className="nm-inset p-4 rounded-xl text-center text-xs text-[var(--color-text-muted)] mb-4">
          URL no reconocida. Usá un enlace válido de YouTube o Spotify.
        </div>
      )}

      {/* Neumorphic Playback Controls */}
      {mediaType && (
        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePlay}
            disabled={isPlaying}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              isPlaying
                ? 'nm-inset text-emerald-700 bg-emerald-50'
                : 'nm-btn-primary'
            }`}
          >
            {isPlaying ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Reproduciendo ({playDuration}s)</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Reproducir Fragmento</span>
              </>
            )}
          </button>

          <button
            onClick={handlePause}
            className="nm-btn px-4 py-3 rounded-xl font-semibold text-xs flex items-center gap-1.5"
            title="Pausar"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
            Pausa
          </button>

          <button
            onClick={handleStop}
            className="nm-btn px-4 py-3 rounded-xl font-semibold text-xs text-rose-600 flex items-center gap-1.5"
            title="Detener"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
            Detener
          </button>
        </div>
      )}

      {/* Empty State */}
      {!mediaType && !url.trim() && (
        <div className="nm-inset p-8 rounded-xl text-center">
          <p className="text-xs text-[var(--color-text-muted)]">
            {hasPlaylist
              ? 'Tocá "Siguiente Canción" para cargar una pista de la lista.'
              : 'Prepará la lista de canciones en el Lobby o pegá una URL arriba.'}
          </p>
        </div>
      )}
    </motion.div>
  );
}
