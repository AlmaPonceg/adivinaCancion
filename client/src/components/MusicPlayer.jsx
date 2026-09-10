import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import socket from '../socket';

function extractYoutubeId(url) {
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
  const match = url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
  return null;
}

export default function MusicPlayer({ roomCode }) {
  const [url, setUrl] = useState('');
  const [mediaType, setMediaType] = useState(null);
  const [mediaId, setMediaId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playDuration, setPlayDuration] = useState(15);
  const [startTime, setStartTime] = useState(0);
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const ytPlayerRef = useRef(null);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript.parentNode.insertBefore(tag, firstScript);
    }
  }, []);

  const handleLoadUrl = useCallback(() => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch (e) { /* */ }
      ytPlayerRef.current = null;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(false);

    const ytId = extractYoutubeId(trimmedUrl);
    if (ytId) {
      setMediaType('youtube');
      setMediaId(ytId);
      setTimeout(() => initYoutubePlayer(ytId), 100);
      return;
    }

    const spotifyEmbed = extractSpotifyEmbed(trimmedUrl);
    if (spotifyEmbed) {
      setMediaType('spotify');
      setMediaId(spotifyEmbed);
      return;
    }

    setMediaType(null);
    setMediaId(null);
  }, [url]);

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
            autoplay: 0, controls: 0, disablekb: 1,
            modestbranding: 1, rel: 0, showinfo: 0, fs: 0,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <p className="label mb-4">Reproductor</p>

      {/* URL Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
          placeholder="URL de YouTube o Spotify"
          className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--color-bg-elevated)]
                   border border-[var(--color-border)] text-[var(--color-text-primary)]
                   placeholder:text-[var(--color-text-muted)]
                   focus:outline-none focus:border-[var(--color-accent)]/50
                   transition-colors duration-200 text-sm"
        />
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLoadUrl}
          className="px-4 py-2.5 rounded-lg font-medium text-sm
                     bg-[var(--color-accent)] text-[var(--color-bg-primary)]
                     hover:bg-[var(--color-accent-dim)]
                     transition-colors duration-200 cursor-pointer shrink-0"
        >
          Cargar
        </motion.button>
      </div>

      {/* Settings */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="label">Duración</span>
          <div className="flex gap-1">
            {[10, 15, 30].map((sec) => (
              <button
                key={sec}
                onClick={() => setPlayDuration(sec)}
                className={`mono px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer ${
                  playDuration === sec
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="label">Inicio</span>
          <input
            type="number"
            value={startTime}
            onChange={(e) => setStartTime(Math.max(0, parseInt(e.target.value) || 0))}
            min="0"
            className="mono w-14 px-2 py-1 rounded-md bg-[var(--color-bg-elevated)]
                     border border-[var(--color-border)] text-[var(--color-text-primary)]
                     focus:outline-none focus:border-[var(--color-accent)]/50
                     text-xs text-center"
          />
          <span className="text-[10px] text-[var(--color-text-muted)]">seg</span>
        </div>
      </div>

      {/* Player */}
      {mediaType === 'youtube' && (
        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4 relative">
          <div id="yt-player" ref={playerRef} className="w-full h-full" />
          <div className="absolute inset-0 z-10" />
        </div>
      )}

      {mediaType === 'spotify' && mediaId && (
        <div className="rounded-lg overflow-hidden mb-4">
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
        <div className="text-center py-5 text-[var(--color-text-muted)] text-sm">
          URL no reconocida. Usá un enlace de YouTube o Spotify.
        </div>
      )}

      {/* Controls */}
      {mediaType && (
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlePlay}
            disabled={isPlaying}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 cursor-pointer
                        flex items-center justify-center gap-2
                       ${isPlaying
                         ? 'bg-[var(--color-correct)]/15 text-[var(--color-correct)] cursor-not-allowed'
                         : 'bg-[var(--color-correct)] text-[var(--color-bg-primary)] hover:brightness-110'
                       }`}
          >
            {isPlaying ? (
              <>
                <span className="flex gap-0.5 items-end h-3.5">
                  <span className="w-[3px] bg-[var(--color-correct)] rounded-full animate-pulse" style={{ height: '60%' }} />
                  <span className="w-[3px] bg-[var(--color-correct)] rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.15s' }} />
                  <span className="w-[3px] bg-[var(--color-correct)] rounded-full animate-pulse" style={{ height: '45%', animationDelay: '0.3s' }} />
                </span>
                Reproduciendo
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlePause}
            className="px-4 py-2.5 rounded-lg font-medium text-sm
                       bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]
                       border border-[var(--color-border)]
                       hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-light)]
                       transition-all duration-200 cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
            Pausa
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStop}
            className="px-4 py-2.5 rounded-lg font-medium text-sm
                       bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]
                       border border-[var(--color-border)]
                       hover:text-[var(--color-coral)] hover:border-[var(--color-coral)]/30
                       transition-all duration-200 cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
            Stop
          </motion.button>
        </div>
      )}

      {/* Empty state */}
      {!mediaType && !url.trim() && (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-full border border-[var(--color-border)] mx-auto mb-3
                          flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">Pegá una URL para empezar</p>
        </div>
      )}
    </motion.div>
  );
}
