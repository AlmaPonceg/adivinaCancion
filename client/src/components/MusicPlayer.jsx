import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
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

const MusicPlayer = forwardRef(function MusicPlayer(
  { roomCode, playlist = [], gameState, onDurationChange },
  ref
) {
  const [shuffledPlaylist, setShuffledPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isRandomMode, setIsRandomMode] = useState(true);

  const [url, setUrl] = useState('');
  const [mediaType, setMediaType] = useState(null);
  const [mediaId, setMediaId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playDuration, setPlayDuration] = useState(() => {
    try {
      const saved = localStorage.getItem('trivia_play_duration');
      return saved ? Math.max(1, parseInt(saved, 10)) : 15;
    } catch {
      return 15;
    }
  });
  const [durationInput, setDurationInput] = useState(() => {
    try {
      const saved = localStorage.getItem('trivia_play_duration');
      return saved ? String(Math.max(1, parseInt(saved, 10))) : '15';
    } catch {
      return '15';
    }
  });
  const [startTime, setStartTime] = useState(0);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [showManualInput, setShowManualInput] = useState(false);

  const applyDuration = useCallback((val) => {
    const parsed = Math.max(1, Math.min(120, parseInt(val, 10) || 1));
    setPlayDuration(parsed);
    setDurationInput(String(parsed));
    try {
      localStorage.setItem('trivia_play_duration', String(parsed));
    } catch {
      /* ignore */
    }
    onDurationChange?.(parsed);
  }, [onDurationChange]);

  const handleInputChange = (e) => {
    // Keep only numbers and allow completely emptying the field to type new digits
    const rawDigits = e.target.value.replace(/\D/g, '');
    setDurationInput(rawDigits);
    if (rawDigits !== '') {
      const parsed = parseInt(rawDigits, 10);
      if (parsed > 0) {
        const clamped = Math.min(120, parsed);
        setPlayDuration(clamped);
        try {
          localStorage.setItem('trivia_play_duration', String(clamped));
        } catch {
          /* ignore */
        }
        onDurationChange?.(clamped);
      }
    }
  };

  const handleInputBlur = () => {
    if (!durationInput || parseInt(durationInput, 10) < 1) {
      applyDuration(1);
    } else {
      const clamped = Math.min(120, parseInt(durationInput, 10));
      applyDuration(clamped);
    }
  };

  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const progressIntervalRef = useRef(null);
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

  const stopProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    stopProgress();
    const startMs = Date.now();
    setPlaybackSeconds(0);
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Math.min(playDuration, (Date.now() - startMs) / 1000);
      setPlaybackSeconds(elapsed);
      if (elapsed >= playDuration) {
        stopProgress();
      }
    }, 100);
  }, [playDuration, stopProgress]);

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
        /* ignore */
      }
      ytPlayerRef.current = null;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    stopProgress();
    setIsPlaying(false);
    setPlaybackSeconds(0);

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
  }, [stopProgress]);

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

  const playAudioOnly = useCallback(() => {
    if (mediaType === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(startTime, true);
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
        startProgress();

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          try {
            ytPlayerRef.current?.pauseVideo();
          } catch (e) {
            /* ignore */
          }
          setIsPlaying(false);
          stopProgress();
        }, playDuration * 1000);
      } catch (e) {
        console.error('Play error:', e);
      }
    }
  }, [mediaType, playDuration, startTime, startProgress, stopProgress]);

  const handleNextAndPlay = useCallback(() => {
    if (!activeQueue || activeQueue.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % activeQueue.length;
    setCurrentTrackIndex(nextIdx);
    const nextUrl = activeQueue[nextIdx];
    setUrl(nextUrl);
    loadMedia(nextUrl);
    setTimeout(() => {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.seekTo(startTime, true);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          startProgress();

          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            try {
              ytPlayerRef.current?.pauseVideo();
            } catch (e) {
              /* ignore */
            }
            setIsPlaying(false);
            stopProgress();
          }, playDuration * 1000);
        } catch (e) {
          /* ignore */
        }
      }
    }, 450);
  }, [activeQueue, currentTrackIndex, loadMedia, startTime, playDuration, startProgress, stopProgress]);

  const handlePause = useCallback(() => {
    if (mediaType === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch (e) {
        /* ignore */
      }
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    stopProgress();
    setIsPlaying(false);
  }, [mediaType, stopProgress]);

  const handleStop = useCallback(() => {
    if (mediaType === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.stopVideo();
      } catch (e) {
        /* ignore */
      }
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    stopProgress();
    setIsPlaying(false);
    setPlaybackSeconds(0);
  }, [mediaType, stopProgress]);

  const handleReplay = useCallback(() => {
    playAudioOnly();
  }, [playAudioOnly]);

  useImperativeHandle(ref, () => ({
    play: playAudioOnly,
    replay: handleReplay,
    nextAndPlay: handleNextAndPlay,
    pause: handlePause,
    stop: handleStop,
    next: handleNextTrack,
    prev: handlePrevTrack,
    currentTrackIndex,
    totalTracks: activeQueue.length,
    isPlaying,
    playDuration,
  }));

  // AUTOMATIC PAUSE ON BUZZ
  useSocketEvent('first-buzz', () => {
    handlePause();
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      stopProgress();
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          /* ignore */
        }
      }
    };
  }, [stopProgress]);

  const hasPlaylist = activeQueue && activeQueue.length > 0;
  const progressPercent = Math.min(100, (playbackSeconds / playDuration) * 100);

  // Frequency wave bars heights configuration
  const equalizerBars = [
    35, 60, 85, 45, 95, 70, 40, 90, 65, 80, 100, 75, 50, 85, 60, 90, 45, 75, 95, 55, 80, 40, 70, 50,
  ];

  return (
    <div className="party-card p-5 sm:p-7 rounded-[2rem] text-[#FAF8F5] relative overflow-hidden">
      {/* Background ambient lighting glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#FF5E36]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#FF1493]/15 rounded-full blur-3xl pointer-events-none" />

      {/* HIDDEN YOUTUBE PLAYER CONTAINER - Plays audio without revealing the video/title */}
      <div
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <div id="yt-player" ref={playerRef} />
      </div>

      {/* Spotify fallback iframe (if ever used) */}
      {mediaType === 'spotify' && mediaId && (
        <div className="hidden">
          <iframe
            src={mediaId}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media"
          />
        </div>
      )}

      {/* Top Deck Bar: Status & Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 relative z-10">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              isPlaying
                ? 'bg-[#059669] shadow-[0_0_12px_#059669] animate-pulse'
                : 'bg-[#D0C8B8]'
            }`}
          />
          <div>
            <span className="font-tactical text-xs font-black tracking-wider uppercase text-[#181226]">
              Deck de Audio Bluetooth
            </span>
            <p className="text-[11px] text-[#6B6280] font-medium">
              {isPlaying ? 'Sonando en parlante' : 'Audio en espera'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPlaylist && (
            <span className="mono text-xs font-black text-[#FF5722] bg-[#FFF0EB] px-3 py-1 rounded-full border border-[#FF5722]/30 shadow-2xs">
              Pista {currentTrackIndex + 1} de {activeQueue.length}
            </span>
          )}

          {hasPlaylist && (
            <button
              onClick={handleReshuffle}
              className="text-xs font-bold text-[#6B6280] hover:text-[#181226] px-2.5 py-1 rounded-lg hover:bg-[#FAF7F2] transition-colors flex items-center gap-1 cursor-pointer"
              title="Volver a mezclar orden"
            >
              <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Mezclar
            </button>
          )}

          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs font-bold text-[#6B6280] hover:text-[#FF5722] px-2.5 py-1 rounded-lg hover:bg-[#FAF7F2] transition-colors cursor-pointer"
          >
            {showManualInput ? 'Cerrar' : '+ URL'}
          </button>
        </div>
      </div>

      {/* CENTER STAGE: Turntable Vinyl Disc + Sound Wave Visualizer */}
      <div className="my-4 p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] flex flex-col sm:flex-row items-center gap-6 relative z-10 shadow-inner">
        {/* Animated Vinyl Disc */}
        <div className="relative shrink-0 flex items-center justify-center">
          <motion.div
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-[#DDD5C5] shadow-xl relative flex items-center justify-center ${
              isPlaying ? 'ring-4 ring-[#FF5722]/30' : ''
            }`}
            style={{
              background: 'radial-gradient(circle, #2C2638 0%, #151020 60%, #08060E 100%)',
            }}
          >
            {/* Concentric groove lines */}
            <div className="w-20 h-20 rounded-full border border-white/10" />
            <div className="w-14 h-14 rounded-full border border-white/5 absolute" />
            {/* Center label */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF5722] via-[#E11D48] to-[#F59E0B] border-2 border-black flex items-center justify-center absolute shadow-md">
              <svg className="w-3.5 h-3.5 text-white fill-current" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          </motion.div>

          {/* Playing badge on disk */}
          {isPlaying && (
            <span className="badge-tag absolute -bottom-1 text-[9px] bg-[#FF5722] text-white px-2.5 py-0.5 rounded-full shadow-lg">
              EN VIVO
            </span>
          )}
        </div>

        {/* Equalizer Waveform & Live Progress */}
        <div className="flex-1 w-full flex flex-col justify-between space-y-3">
          {/* Animated Waveform Bars */}
          <div className="h-16 flex items-end justify-between gap-1 px-1 bg-white rounded-xl p-2 border border-[#EAE3D5] shadow-inner">
            {equalizerBars.map((baseHeight, idx) => (
              <motion.div
                key={idx}
                animate={{
                  height: isPlaying
                    ? [`${Math.max(15, baseHeight * 0.35)}%`, `${baseHeight}%`, `${Math.max(20, baseHeight * 0.6)}%`]
                    : '12%',
                }}
                transition={{
                  repeat: Infinity,
                  duration: isPlaying ? 0.35 + (idx % 4) * 0.1 : 0.8,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }}
                className="flex-1 rounded-full bg-gradient-to-t from-[#FF5722] via-[#E11D48] to-[#F59E0B] min-w-[2px]"
              />
            ))}
          </div>

          {/* Digital Timer & Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono font-black text-[#6B6280] mb-1.5">
              <span className="text-[#181226]">
                00:{String(Math.floor(playbackSeconds)).padStart(2, '0')}
              </span>
              <span className="text-[#FF5722]">
                00:{String(playDuration).padStart(2, '0')}
              </span>
            </div>

            <div className="w-full h-2.5 bg-[#EAE3D5] rounded-full overflow-hidden border border-[#DDD5C5]">
              <div
                className="h-full bg-gradient-to-r from-[#FF5722] via-[#E11D48] to-[#F59E0B] transition-all duration-100 ease-linear rounded-full shadow-[0_0_8px_#FF5722]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Manual URL drawer (if open) */}
      {showManualInput && (
        <div className="flex gap-2 mb-4 relative z-10">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadMedia(url)}
            placeholder="Pegá enlace de YouTube o Spotify"
            className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-[#EAE3D5] text-[#181226] placeholder:text-[#8E869E] focus:outline-none focus:border-[#FF5722]"
          />
          <button
            onClick={() => loadMedia(url)}
            className="arcade-btn-primary px-4 py-2 text-xs font-bold shrink-0 cursor-pointer rounded-xl"
          >
            Cargar
          </button>
        </div>
      )}

      {/* Audio Deck Bottom Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 relative z-10 border-t border-[#EAE3D5]">
        {/* Custom Duration Controller */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="badge-tag text-[#6B6280]">
              Duración:
            </span>
            <div className="flex items-center bg-white border border-[#EAE3D5] rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => applyDuration(playDuration - 1)}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-[#FAF7F2] hover:bg-[#EAE3D5] text-[#181226] font-black text-xs cursor-pointer transition-all active:scale-90"
                title="Restar 1 segundo"
                aria-label="Restar 1 segundo"
              >
                -
              </button>
              <div className="flex items-center px-1.5 gap-0.5">
                <input
                  type="text"
                  value={durationInput}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className="mono text-xs font-black text-[#181226] w-7 text-center bg-transparent border-none p-0 focus:outline-none"
                  aria-label="Duración en segundos"
                />
                <span className="text-[10px] font-bold text-[#6B6280]">s</span>
              </div>
              <button
                type="button"
                onClick={() => applyDuration(playDuration + 1)}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-[#FAF7F2] hover:bg-[#EAE3D5] text-[#181226] font-black text-xs cursor-pointer transition-all active:scale-90"
                title="Sumar 1 segundo"
                aria-label="Sumar 1 segundo"
              >
                +
              </button>
            </div>
          </div>
          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5">
            {[2, 3, 4, 5, 10, 15].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => applyDuration(sec)}
                className={`mono text-[11px] font-bold px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                  playDuration === sec
                    ? 'bg-[#FF5722] text-white shadow-xs font-black'
                    : 'bg-white text-[#6B6280] border border-[#EAE3D5] hover:text-[#181226] hover:bg-[#FAF7F2]'
                }`}
                title={`Fijar en ${sec} segundos`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        {/* Audio helper actions (Replay, Pause, Next) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReplay}
            className="arcade-btn px-3 py-1.5 rounded-xl text-xs font-bold text-[#181226] flex items-center gap-1.5 cursor-pointer"
            title="Volver a reproducir el clip de audio"
          >
            <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Repetir Clip</span>
          </button>

          {isPlaying ? (
            <button
              onClick={handlePause}
              className="px-3 py-1.5 rounded-xl bg-[#FFFBEB] text-[#B45309] border border-[#F59E0B]/50 hover:bg-[#FEF3C7] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Pausar audio"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              <span>Pausar</span>
            </button>
          ) : (
            <button
              onClick={playAudioOnly}
              className="arcade-btn-mint px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="Reproducir audio"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>Reproducir</span>
            </button>
          )}

          {hasPlaylist && (
            <div className="flex items-center gap-1 pl-1 border-l border-[#EAE3D5]">
              <button
                onClick={handlePrevTrack}
                title="Pista anterior"
                className="p-1.5 rounded-lg text-[#6B6280] hover:text-[#181226] hover:bg-[#FAF7F2] cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>
              <button
                onClick={handleNextTrack}
                title="Siguiente pista"
                className="p-1.5 rounded-lg text-[#6B6280] hover:text-[#181226] hover:bg-[#FAF7F2] cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Spoilers prevention note */}
      <p className="text-[11px] text-[#8E869E] text-center mt-3 pt-2 border-t border-[#EAE3D5]">
        El reproductor de video está oculto para que nadie pueda ver el título de la canción.
      </p>
    </div>
  );
});

export default MusicPlayer;
