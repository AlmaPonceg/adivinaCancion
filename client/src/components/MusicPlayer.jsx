import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import socket from '../socket';
import { useSocketEvent } from '../hooks/useSocket';

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

// Fisher-Yates shuffle helper
function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function MusicPlayer({ roomCode, playlist = [] }) {
  const [shuffledPlaylist, setShuffledPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isRandomMode, setIsRandomMode] = useState(true);

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
      try {
        ytPlayerRef.current.destroy();
      } catch (e) {
        /* */
      }
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

  // Initialize and shuffle playlist in random order by default
  useEffect(() => {
    if (playlist && playlist.length > 0) {
      const ordered = isRandomMode ? shuffleArray(playlist) : [...playlist];
      setShuffledPlaylist(ordered);
      setCurrentTrackIndex(0);
      const initialTrack = ordered[0];
      setUrl(initialTrack);
      loadMedia(initialTrack);
    }
  }, [playlist, isRandomMode, loadMedia]);

  const initYoutubePlayer = useCallback(
    (videoId) => {
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
    },
    [startTime]
  );

  const activeQueue = shuffledPlaylist.length > 0 ? shuffledPlaylist : playlist;

  const handleNextTrack = () => {
    if (!activeQueue || activeQueue.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % activeQueue.length;
    setCurrentTrackIndex(nextIdx);
    const nextUrl = activeQueue[nextIdx];
    setUrl(nextUrl);
    loadMedia(nextUrl);
  };

  const handlePrevTrack = () => {
    if (!activeQueue || activeQueue.length === 0) return;
    const prevIdx = currentTrackIndex === 0 ? activeQueue.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(prevIdx);
    const prevUrl = activeQueue[prevIdx];
    setUrl(prevUrl);
    loadMedia(prevUrl);
  };

  const handleReshuffle = () => {
    if (!playlist || playlist.length === 0) return;
    const randomized = shuffleArray(playlist);
    setShuffledPlaylist(randomized);
    setCurrentTrackIndex(0);
    const nextUrl = randomized[0];
    setUrl(nextUrl);
    loadMedia(nextUrl);
  };

  const handlePlay = useCallback(() => {
    if (mediaType === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(startTime, true);
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          try {
            ytPlayerRef.current?.pauseVideo();
          } catch (e) {
            /* */
          }
          setIsPlaying(false);
        }, playDuration * 1000);
      } catch (e) {
        console.error('Play error:', e);
      }
    }
  }, [mediaType, playDuration, startTime]);

  const handlePause = useCallback(() => {
    if (mediaType === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch (e) {
        /* */
      }
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(false);
  }, [mediaType]);

  const handleStop = useCallback(() => {
    if (mediaType === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.stopVideo();
      } catch (e) {
        /* */
      }
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(false);
  }, [mediaType]);

  // AUTOMATIC PAUSE ON BUZZ
  useSocketEvent('first-buzz', () => {
    handlePause();
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          /* */
        }
      }
    };
  }, []);

  const hasPlaylist = activeQueue && activeQueue.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="nm-flat p-5 sm:p-7 rounded-3xl"
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">
              Reproductor Anfitrión
            </span>
            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              🔊 Solo en este parlante / Bluetooth
            </span>
          </div>

          {hasPlaylist && (
            <div className="flex items-center gap-2 mt-1">
              <span className="mono text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Pista {currentTrackIndex + 1} de {activeQueue.length}
              </span>
              {isRandomMode && (
                <span className="text-[11px] font-black text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                  🔀 Orden Aleatorio
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasPlaylist && (
            <button
              onClick={handleReshuffle}
              className="nm-btn text-xs font-black px-3 py-1.5 rounded-xl text-purple-700 hover:text-purple-900 flex items-center gap-1"
              title="Volver a mezclar el orden de las canciones aleatoriamente"
            >
              <span>🔀</span> Mezclar
            </button>
          )}

          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 cursor-pointer"
          >
            {showManualInput ? 'Ocultar input manual' : '+ URL manual'}
          </button>
        </div>
      </div>

      {/* Playlist Queue Controller */}
      {hasPlaylist && (
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mb-5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="mono text-xs font-semibold text-slate-700 truncate">
              {url || 'Cargando pista...'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrevTrack}
              title="Canción anterior"
              className="nm-btn p-2.5 rounded-xl text-slate-600 hover:text-slate-900"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button
              onClick={handleNextTrack}
              className="nm-btn-primary px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm"
              title="Avanzar a la siguiente canción aleatoria"
            >
              <span>Siguiente 🔀</span>
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Optional Manual URL input */}
      {(!hasPlaylist || showManualInput) && (
        <div className="flex gap-2 mb-5">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadMedia(url)}
            placeholder="Pegá URL de YouTube o Spotify"
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300"
          />
          <button
            onClick={() => loadMedia(url)}
            className="nm-btn px-5 py-2.5 font-black text-xs shrink-0 text-indigo-600"
          >
            Cargar
          </button>
        </div>
      )}

      {/* Playback Settings */}
      <div className="flex flex-wrap items-center gap-4 mb-5 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-600">Duración:</span>
          <div className="flex gap-1.5">
            {[10, 15, 30].map((sec) => (
              <button
                key={sec}
                onClick={() => setPlayDuration(sec)}
                className={`mono px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  playDuration === sec
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-600">Desde:</span>
          <input
            type="number"
            value={startTime}
            onChange={(e) => setStartTime(Math.max(0, parseInt(e.target.value) || 0))}
            min="0"
            className="mono w-14 px-2 py-1 text-xs text-center rounded-lg border border-slate-300 font-bold"
          />
          <span className="text-xs text-slate-500 font-bold">seg</span>
        </div>

        <span className="text-[11px] text-slate-500 ml-auto italic">
          * Al pulsar el buzzer, la música se frena automáticamente
        </span>
      </div>

      {/* Video Container */}
      {mediaType === 'youtube' && (
        <div className="p-2.5 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden mb-5">
          <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-inner">
            <div id="yt-player" ref={playerRef} className="w-full h-full" />
            <div className="absolute inset-0 z-10 pointer-events-none" />
          </div>
        </div>
      )}

      {mediaType === 'spotify' && mediaId && (
        <div className="p-2.5 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden mb-5">
          <iframe
            src={mediaId}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
          />
        </div>
      )}

      {!mediaType && url.trim() && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center text-xs text-amber-800 font-bold mb-5">
          URL no reconocida. Usá un enlace válido de YouTube o Spotify.
        </div>
      )}

      {/* Playback Controls */}
      {mediaType && (
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlay}
            disabled={isPlaying}
            className={`flex-1 py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
              isPlaying
                ? 'bg-emerald-600 text-white'
                : 'nm-btn-primary'
            }`}
          >
            {isPlaying ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span>Sonando ({playDuration}s)...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Reproducir Fragmento</span>
              </>
            )}
          </button>

          <button
            onClick={handlePause}
            className="nm-btn px-5 py-3.5 rounded-2xl font-black text-xs flex items-center gap-1.5"
            title="Pausar"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
            Pausa
          </button>

          <button
            onClick={handleStop}
            className="nm-btn px-5 py-3.5 rounded-2xl font-black text-xs text-rose-600 flex items-center gap-1.5"
            title="Detener"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
            Stop
          </button>
        </div>
      )}

      {/* Empty State */}
      {!mediaType && !url.trim() && (
        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center">
          <p className="text-xs text-slate-500 font-semibold">
            {hasPlaylist
              ? 'Tocá "Siguiente 🔀" para cargar la primera pista aleatoria de la playlist.'
              : 'Cargá las canciones en el Lobby antes de comenzar para reproducirlas aleatoriamente.'}
          </p>
        </div>
      )}
    </motion.div>
  );
}
