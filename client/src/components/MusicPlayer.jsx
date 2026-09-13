import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import socket from '../socket';
import { useSocketEvent } from '../hooks/useSocket';
import {
  extractYoutubeId,
  extractSpotifyEmbed,
  normalizeTrack,
  getTrackTitle,
  isLocalTrack,
} from '../utils/trackHelper';
import {
  saveAudioFile,
  createTrackObjectUrl,
  hydratePlaylistTracks,
} from '../utils/audioStorage';

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
  { roomCode, playlist = [], gameState, roundNumber = 0, onDurationChange, onTrackChange },
  ref
) {
  const [shuffledPlaylist, setShuffledPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isRandomMode, setIsRandomMode] = useState(true);
  const queueSignatureRef = useRef('');
  const activeQueueRef = useRef([]);
  const pendingPlayRef = useRef(null);

  const [currentTrack, setCurrentTrack] = useState(null);
  const [url, setUrl] = useState('');
  const [mediaType, setMediaType] = useState(null); // 'local' | 'youtube' | 'spotify'
  const [mediaId, setMediaId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [antiSpoiler, setAntiSpoiler] = useState(() => {
    return localStorage.getItem('trivia_anti_spoiler') === 'true';
  });
  const [revealedCurrentTrack, setRevealedCurrentTrack] = useState(false);

  useEffect(() => {
    setRevealedCurrentTrack(false);
  }, [currentTrack?.id]);

  useEffect(() => {
    onTrackChange?.(currentTrack);
  }, [currentTrack, onTrackChange]);

  const audioPlayerRef = useRef(null);
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
  const startTimeRef = useRef(0);
  const [currentTrackTime, setCurrentTrackTime] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const progressBarRef = useRef(null);
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

  const stopProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    stopProgress();
    progressIntervalRef.current = setInterval(() => {
      let liveTime = null;
      let liveDur = null;

      if (mediaType === 'youtube' && ytPlayerRef.current) {
        try {
          if (typeof ytPlayerRef.current.getCurrentTime === 'function') {
            liveTime = ytPlayerRef.current.getCurrentTime();
          }
          if (typeof ytPlayerRef.current.getDuration === 'function') {
            liveDur = ytPlayerRef.current.getDuration();
          }
        } catch {
          /* ignore */
        }
      } else if (mediaType === 'local' && audioPlayerRef.current) {
        liveTime = audioPlayerRef.current.currentTime;
        liveDur = audioPlayerRef.current.duration;
      }

      if (typeof liveTime === 'number' && !isNaN(liveTime) && liveTime >= 0) {
        setCurrentTrackTime(liveTime);
      }
      if (typeof liveDur === 'number' && !isNaN(liveDur) && liveDur > 0) {
        setTrackDuration(liveDur);
      }
    }, 150);
  }, [mediaType, stopProgress]);

  const loadMedia = useCallback(
    (trackInput) => {
      if (!trackInput) {
        setMediaType(null);
        setMediaId(null);
        setCurrentTrack(null);
        return;
      }

      const track = normalizeTrack(trackInput);
      setCurrentTrack(track);

      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.pauseVideo?.();
          ytPlayerRef.current.seekTo?.(0, true);
        } catch {
          /* ignore */
        }
      }
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.pause();
        } catch {
          /* ignore */
        }
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      stopProgress();
      setIsPlaying(false);
      setCurrentTrackTime(0);
      setTrackDuration(0);

      // 1. LOCAL OFFLINE AUDIO (MP3, WAV, OGG, M4A or Blob URL)
      if (track.type === 'local' || isLocalTrack(track.url)) {
        setMediaType('local');
        setMediaId(track.url);
        startTimeRef.current = 0;
        setStartTime(0);
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = track.url;
          audioPlayerRef.current.currentTime = 0;
          audioPlayerRef.current.onloadedmetadata = () => {
            if (audioPlayerRef.current?.duration) {
              setTrackDuration(audioPlayerRef.current.duration);
            }
          };
          audioPlayerRef.current.load();
        }
        return;
      }

      // 2. YOUTUBE VIDEO
      const ytId = extractYoutubeId(track.url);
      if (ytId) {
        setMediaType('youtube');
        setMediaId(ytId);
        startTimeRef.current = 0;
        setStartTime(0);
        return;
      }

      // 3. SPOTIFY EMBED
      const spotifyEmbed = extractSpotifyEmbed(track.url);
      if (spotifyEmbed) {
        setMediaType('spotify');
        setMediaId(spotifyEmbed);
        return;
      }

      // 4. DIRECT AUDIO URL (e.g. .mp3, .wav)
      if (
        typeof track.url === 'string' &&
        (track.url.endsWith('.mp3') || track.url.endsWith('.wav') || track.url.endsWith('.ogg'))
      ) {
        setMediaType('local');
        setMediaId(track.url);
        startTimeRef.current = 0;
        setStartTime(0);
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = track.url;
          audioPlayerRef.current.currentTime = 0;
          audioPlayerRef.current.onloadedmetadata = () => {
            if (audioPlayerRef.current?.duration) {
              setTrackDuration(audioPlayerRef.current.duration);
            }
          };
          audioPlayerRef.current.load();
        }
        return;
      }

      setMediaType(null);
      setMediaId(null);
    },
    [stopProgress]
  );

  // ── Native YouTube IFrame API Management ────────────────────
  useEffect(() => {
    if (mediaType !== 'youtube' || !mediaId) return;

    let isMounted = true;

    const setupPlayer = () => {
      if (!isMounted) return;

      if (ytPlayerRef.current && typeof ytPlayerRef.current.cueVideoById === 'function') {
        try {
          ytPlayerRef.current.cueVideoById({
            videoId: mediaId,
            startSeconds: startTimeRef.current || 0,
          });
          const d = ytPlayerRef.current.getDuration?.();
          if (typeof d === 'number' && d > 0) setTrackDuration(d);
          return;
        } catch (e) {
          console.warn('Re-instantiating YT.Player:', e);
        }
      }

      const slot = document.getElementById('youtube-player-slot');
      if (!slot) return;

      try {
        ytPlayerRef.current = new window.YT.Player('youtube-player-slot', {
          width: '100%',
          height: '100%',
          videoId: mediaId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            fs: 0,
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onReady: (e) => {
              try {
                e.target.unMute?.();
                e.target.setVolume?.(100);
                const d = e.target.getDuration?.();
                if (typeof d === 'number' && d > 0) setTrackDuration(d);
              } catch {
                /* ignore */
              }

              if (pendingPlayRef.current) {
                const target = pendingPlayRef.current.target || 0;
                pendingPlayRef.current = null;
                try {
                  e.target.seekTo?.(target, true);
                  e.target.unMute?.();
                  e.target.setVolume?.(100);
                  e.target.playVideo();
                  setCurrentTrackTime(target);
                  setIsPlaying(true);
                  startProgress();

                  if (timerRef.current) clearTimeout(timerRef.current);
                  timerRef.current = setTimeout(() => {
                    handlePause();
                  }, playDuration * 1000);
                } catch (err) {
                  console.error('onReady pending play error:', err);
                }
              }
            },
            onStateChange: (e) => {
              const d = e.target.getDuration?.();
              if (typeof d === 'number' && d > 0) setTrackDuration(d);
              // 1: PLAYING, 2: PAUSED, 0: ENDED
              if (e.data === 1) {
                setIsPlaying(true);
                startProgress();
              } else if (e.data === 2 || e.data === 0) {
                setIsPlaying(false);
                stopProgress();
              }
            },
            onError: (e) => {
              console.warn('YouTube playback error code:', e.data);
            },
          },
        });
      } catch (err) {
        console.error('Error instantiating YT.Player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      setupPlayer();
    } else {
      if (!document.getElementById('yt-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev();
        setupPlayer();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [mediaType, mediaId]);

  // Initialize and shuffle playlist in random order by default with IndexedDB hydration
  useEffect(() => {
    let isMounted = true;
    async function initPlaylistQueue() {
      if (playlist && playlist.length > 0) {
        const sig = playlist.map((p) => (typeof p === 'object' ? p.id || p.name || p.url : p)).join(';;') + `::${isRandomMode}`;
        if (queueSignatureRef.current === sig) {
          return;
        }
        queueSignatureRef.current = sig;

        const hydrated = await hydratePlaylistTracks(playlist);
        if (!isMounted) return;
        const ordered = isRandomMode ? shuffleArray(hydrated) : [...hydrated];
        activeQueueRef.current = ordered;
        setShuffledPlaylist(ordered);
        setCurrentTrackIndex(0);
        const initialTrack = ordered[0];
        setUrl(initialTrack.url || initialTrack);
        loadMedia(initialTrack);
      } else {
        queueSignatureRef.current = '';
        activeQueueRef.current = [];
        setShuffledPlaylist([]);
        setCurrentTrack(null);
      }
    }
    initPlaylistQueue();
    return () => {
      isMounted = false;
    };
  }, [playlist, isRandomMode, loadMedia]);

  const activeQueue = shuffledPlaylist.length > 0 ? shuffledPlaylist : playlist;

  const handleNextTrack = () => {
    if (!activeQueue || activeQueue.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % activeQueue.length;
    setCurrentTrackIndex(nextIdx);
    const nextTrack = activeQueue[nextIdx];
    setUrl(nextTrack.url || nextTrack);
    loadMedia(nextTrack);
  };

  const handlePrevTrack = () => {
    if (!activeQueue || activeQueue.length === 0) return;
    const prevIdx = currentTrackIndex === 0 ? activeQueue.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(prevIdx);
    const prevTrack = activeQueue[prevIdx];
    setUrl(prevTrack.url || prevTrack);
    loadMedia(prevTrack);
  };

  const handleReshuffle = () => {
    if (!playlist || playlist.length === 0) return;
    const randomized = shuffleArray(playlist);
    activeQueueRef.current = randomized;
    setShuffledPlaylist(randomized);
    setCurrentTrackIndex(0);
    const nextTrack = randomized[0];
    setUrl(nextTrack.url || nextTrack);
    loadMedia(nextTrack);
  };

  const handlePause = useCallback(() => {
    if (mediaType === 'local' && audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        if (typeof audioPlayerRef.current.currentTime === 'number') {
          setCurrentTrackTime(audioPlayerRef.current.currentTime);
          startTimeRef.current = audioPlayerRef.current.currentTime;
        }
      } catch (e) {
        /* ignore */
      }
    }
    if (mediaType === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.pauseVideo?.();
        const t = ytPlayerRef.current.getCurrentTime?.();
        if (typeof t === 'number' && !isNaN(t)) {
          setCurrentTrackTime(t);
          startTimeRef.current = t;
        }
      } catch {
        /* ignore */
      }
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    stopProgress();
    setIsPlaying(false);
  }, [mediaType, stopProgress]);

  const handleSkip = (seconds) => {
    let current = currentTrackTime;
    if (mediaType === 'youtube' && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
      try {
        const t = ytPlayerRef.current.getCurrentTime();
        if (typeof t === 'number' && !isNaN(t)) current = t;
      } catch {
        current = startTimeRef.current;
      }
    } else if (mediaType === 'local' && audioPlayerRef.current) {
      if (typeof audioPlayerRef.current.currentTime === 'number') {
        current = audioPlayerRef.current.currentTime;
      }
    } else {
      current = startTimeRef.current;
    }

    const maxDur = trackDuration > 0 ? trackDuration : 9999;
    const newTarget = Math.max(0, Math.min(maxDur, Math.round(current + seconds)));
    startTimeRef.current = newTarget;
    setCurrentTrackTime(newTarget);
    setStartTime(newTarget);

    if (mediaType === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo?.(newTarget, true);
      } catch {
        /* ignore */
      }
    } else if (mediaType === 'local' && audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = newTarget;
    }

    if (isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      startProgress();
      timerRef.current = setTimeout(() => {
        handlePause();
      }, playDuration * 1000);
    }
  };

  const calculateTimeFromPointer = useCallback(
    (e) => {
      if (!progressBarRef.current) return 0;
      const rect = progressBarRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
      const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = rect.width > 0 ? offsetX / rect.width : 0;
      const maxDur = trackDuration > 0 ? trackDuration : 180;
      return Math.max(0, Math.min(maxDur, ratio * maxDur));
    },
    [trackDuration]
  );

  const commitSeek = useCallback(
    (targetSecs) => {
      const rounded = Math.round(targetSecs * 10) / 10;
      startTimeRef.current = rounded;
      setCurrentTrackTime(rounded);
      setStartTime(rounded);

      if (mediaType === 'youtube' && ytPlayerRef.current) {
        try {
          ytPlayerRef.current.seekTo?.(rounded, true);
        } catch {
          /* ignore */
        }
      } else if (mediaType === 'local' && audioPlayerRef.current) {
        audioPlayerRef.current.currentTime = rounded;
      }

      if (isPlaying) {
        if (timerRef.current) clearTimeout(timerRef.current);
        startProgress();
        timerRef.current = setTimeout(() => {
          handlePause();
        }, playDuration * 1000);
      }
    },
    [mediaType, isPlaying, playDuration, startProgress, handlePause]
  );

  const handlePointerDown = (e) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setIsScrubbing(true);
    const target = calculateTimeFromPointer(e);
    setScrubTime(target);
  };

  const handlePointerMove = (e) => {
    if (!isScrubbing) return;
    const target = calculateTimeFromPointer(e);
    setScrubTime(target);
  };

  const handlePointerUp = (e) => {
    if (!isScrubbing) return;
    const target = calculateTimeFromPointer(e);
    setIsScrubbing(false);
    commitSeek(target);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const playAudioOnly = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // ── Local Offline Audio Playback ─────────────────────────
    if (mediaType === 'local' && audioPlayerRef.current) {
      try {
        const audio = audioPlayerRef.current;
        const target = startTimeRef.current || 0;
        audio.currentTime = target;
        setCurrentTrackTime(target);
        const promise = audio.play();
        if (promise !== undefined) {
          promise.catch((err) => console.warn('Local audio play error:', err));
        }
        setIsPlaying(true);
        startProgress();

        timerRef.current = setTimeout(() => {
          handlePause();
        }, playDuration * 1000);
      } catch (e) {
        console.error('Local audio error:', e);
      }
      return;
    }

    // ── YouTube IFrame Audio Playback ────────────────────────
    if (mediaType === 'youtube') {
      const target = startTimeRef.current || 0;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
        try {
          ytPlayerRef.current.seekTo?.(target, true);
          ytPlayerRef.current.unMute?.();
          ytPlayerRef.current.setVolume?.(100);
          ytPlayerRef.current.playVideo();
          setCurrentTrackTime(target);
          setIsPlaying(true);
          startProgress();

          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            handlePause();
          }, playDuration * 1000);
        } catch (e) {
          console.error('YouTube play error:', e);
        }
      } else {
        pendingPlayRef.current = { target };
      }
      return;
    }
  }, [mediaType, playDuration, startProgress, handlePause]);

  const handleNextAndPlay = useCallback(() => {
    if (!activeQueue || activeQueue.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % activeQueue.length;
    setCurrentTrackIndex(nextIdx);
    const nextTrack = activeQueue[nextIdx];
    setUrl(nextTrack.url || nextTrack);
    loadMedia(nextTrack);

    const isLocal = isLocalTrack(nextTrack) || (typeof nextTrack === 'object' && nextTrack.type === 'local');

    setTimeout(() => {
      if (isLocal && audioPlayerRef.current) {
        try {
          const audio = audioPlayerRef.current;
          audio.currentTime = 0;
          setCurrentTrackTime(0);
          const promise = audio.play();
          if (promise !== undefined) promise.catch((err) => console.warn(err));
          setIsPlaying(true);
          startProgress();

          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            handlePause();
          }, playDuration * 1000);
        } catch (err) {
          console.error('Local nextAndPlay error:', err);
        }
      } else {
        try {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
            ytPlayerRef.current.seekTo?.(0, true);
            ytPlayerRef.current.unMute?.();
            ytPlayerRef.current.setVolume?.(100);
            ytPlayerRef.current.playVideo();
            setCurrentTrackTime(0);
          }
          
          setIsPlaying(true);
          startProgress();

          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            handlePause();
          }, playDuration * 1000);
        } catch (err) {
          console.error('YT nextAndPlay error:', err);
        }
      }
    }, isLocal ? 120 : 450);
  }, [activeQueue, currentTrackIndex, loadMedia, playDuration, startProgress, handlePause]);

  const handleStop = useCallback(() => {
    if (mediaType === 'local' && audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      } catch (e) {
        /* ignore */
      }
    }
    if (mediaType === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.pauseVideo?.();
        ytPlayerRef.current.seekTo?.(0, true);
      } catch {
        /* ignore */
      }
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    stopProgress();
    setIsPlaying(false);
    setCurrentTrackTime(0);
    startTimeRef.current = 0;
    setStartTime(0);
  }, [mediaType, stopProgress]);

  const handleReplay = useCallback(() => {
    playAudioOnly();
  }, [playAudioOnly]);

  const handleManualLocalUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files || files.length === 0) return;
    const file = files[0];
    const fileId = `manual_local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await saveAudioFile(fileId, file);
    const objectUrl = createTrackObjectUrl(fileId, file);
    const track = {
      id: fileId,
      type: 'local',
      name: file.name,
      url: objectUrl,
      size: file.size,
      fileId,
    };
    loadMedia(track);
    setUrl(file.name);
  };

  const playTrackForRound = useCallback(
    (roundNum) => {
      const queue =
        activeQueueRef.current.length > 0
          ? activeQueueRef.current
          : shuffledPlaylist.length > 0
          ? shuffledPlaylist
          : playlist;
      if (!queue || queue.length === 0) return;

      const targetIdx = Math.max(0, roundNum - 1) % queue.length;
      setCurrentTrackIndex(targetIdx);
      const targetTrack = queue[targetIdx];
      setUrl(targetTrack.url || targetTrack);
      loadMedia(targetTrack);

      const isLocal = isLocalTrack(targetTrack) || (typeof targetTrack === 'object' && targetTrack.type === 'local');

      setTimeout(() => {
        if (isLocal && audioPlayerRef.current) {
          try {
            const audio = audioPlayerRef.current;
            audio.currentTime = 0;
            setCurrentTrackTime(0);
            const promise = audio.play();
            if (promise !== undefined) promise.catch((err) => console.warn(err));
            setIsPlaying(true);
            startProgress();

            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
              handlePause();
            }, playDuration * 1000);
          } catch (err) {
            console.error('Local playTrackForRound error:', err);
          }
        } else {
          pendingPlayRef.current = { target: 0 };
          try {
            if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
              pendingPlayRef.current = null;
              ytPlayerRef.current.seekTo?.(0, true);
              ytPlayerRef.current.unMute?.();
              ytPlayerRef.current.setVolume?.(100);
              ytPlayerRef.current.playVideo();
              setCurrentTrackTime(0);
              setIsPlaying(true);
              startProgress();

              if (timerRef.current) clearTimeout(timerRef.current);
              timerRef.current = setTimeout(() => {
                handlePause();
              }, playDuration * 1000);
            }
          } catch (err) {
            console.error('YT playTrackForRound error:', err);
          }
        }
      }, isLocal ? 120 : 450);
    },
    [shuffledPlaylist, playlist, loadMedia, playDuration, startProgress, handlePause]
  );

  useImperativeHandle(ref, () => ({
    play: playAudioOnly,
    replay: handleReplay,
    nextAndPlay: handleNextAndPlay,
    playTrackForRound,
    pause: handlePause,
    stop: handleStop,
    next: handleNextTrack,
    prev: handlePrevTrack,
    currentTrackIndex,
    currentTrack,
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
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.pause();
        } catch {
          /* ignore */
        }
      }
    };
  }, [stopProgress]);

  const hasPlaylist = activeQueue && activeQueue.length > 0;
  const displayedTime = isScrubbing ? scrubTime : currentTrackTime;
  const maxDuration = trackDuration > 0 ? trackDuration : (displayedTime > 0 ? displayedTime + 10 : 180);
  const progressPercent = maxDuration > 0 ? Math.min(100, Math.max(0, (displayedTime / maxDuration) * 100)) : 0;

  const formatTime = (secs) => {
    if (typeof secs !== 'number' || isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Frequency wave bars heights configuration
  const equalizerBars = [
    35, 60, 85, 45, 95, 70, 40, 90, 65, 80, 100, 75, 50, 85, 60, 90, 45, 75, 95, 55, 80, 40, 70, 50,
  ];

  return (
    <div className="party-card p-5 sm:p-7 rounded-[2rem] text-[#FAF8F5] relative overflow-hidden">
      {/* Background ambient lighting glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#FF5E36]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#FF1493]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Native HTML5 Audio Element for Local Offline Tracks */}
      <audio
        ref={audioPlayerRef}
        preload="auto"
        onEnded={() => {
          setIsPlaying(false);
          stopProgress();
        }}
        onError={(e) => console.warn('Native audio error:', e)}
        className="hidden"
      />

      {/* YOUTUBE PLAYER CONTAINER - Real size, placed behind page so video isn't visible, preventing Chrome/YouTube throttling */}
      <div
        id="youtube-container"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '320px',
          height: '180px',
          zIndex: -20,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {mediaType === 'youtube' && mediaId && (
          <div id="youtube-player-slot" />
        )}
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

      {/* Track info banner (source and title) */}
      {currentTrack && (
        <div className="flex items-center gap-2 mb-3 px-1 relative z-10">
          {currentTrack.type === 'local' ? (
            <span className="badge-tag bg-[#E6F9F0] text-[#059669] border border-[#059669]/40 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs shrink-0">
              <svg className="w-3 h-3 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>OFFLINE (Sin datos)</span>
            </span>
          ) : currentTrack.type === 'youtube' ? (
            <span className="badge-tag bg-[#FFF0EB] text-[#FF5722] border border-[#FF5722]/30 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs shrink-0">
              <svg className="w-3 h-3 text-[#FF5722]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
              <span>YOUTUBE</span>
            </span>
          ) : (
            <span className="badge-tag bg-[#FAF7F2] text-[#6B6280] border border-[#EAE3D5] px-2 py-0.5 rounded-md shrink-0">
              <span>WEB URL</span>
            </span>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <p
              className={`font-display text-xs sm:text-sm font-black text-[#181226] truncate select-none ${
                antiSpoiler && !revealedCurrentTrack
                  ? 'filter blur-[6px] hover:blur-none transition-all cursor-pointer text-[#8E869E]'
                  : ''
              }`}
              title={antiSpoiler && !revealedCurrentTrack ? 'Clic para revelar título de la canción' : currentTrack.name}
              onClick={() => {
                if (antiSpoiler) setRevealedCurrentTrack(!revealedCurrentTrack);
              }}
            >
              {antiSpoiler && !revealedCurrentTrack
                ? '•••••••••••••••••••• (Anti-Spoiler)'
                : currentTrack.name}
            </p>
            {antiSpoiler && (
              <button
                type="button"
                onClick={() => setRevealedCurrentTrack(!revealedCurrentTrack)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#8E869E] hover:text-[#FF5722] cursor-pointer shrink-0 transition-colors"
                title={revealedCurrentTrack ? 'Ocultar título' : 'Revelar título de la canción'}
                aria-label={revealedCurrentTrack ? 'Ocultar título' : 'Revelar título'}
              >
                {revealedCurrentTrack ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            )}
          </div>
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

          <button
            type="button"
            onClick={() => {
              const next = !antiSpoiler;
              setAntiSpoiler(next);
              localStorage.setItem('trivia_anti_spoiler', next ? 'true' : 'false');
            }}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              antiSpoiler
                ? 'bg-[#FFF0EB] text-[#FF5722] border border-[#FF5722]/30 shadow-2xs font-black'
                : 'text-[#6B6280] hover:text-[#181226] hover:bg-[#FAF7F2]'
            }`}
            title={antiSpoiler ? 'Modo Anti-Spoiler activo (oculta títulos de pistas)' : 'Activar Modo Anti-Spoiler'}
          >
            <span>{antiSpoiler ? 'Anti-Spoiler' : 'Ver Títulos'}</span>
          </button>

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

          {/* Digital Timer & Interactive Scrubber Bar */}
          <div className="space-y-1.5 select-none">
            <div className="flex items-center justify-between text-xs font-mono font-black text-[#6B6280]">
              <span className="text-[#181226] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#EAE3D5] shadow-2xs">
                {formatTime(displayedTime)}
              </span>
              <span className="text-[#FF5722] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#EAE3D5] shadow-2xs">
                {trackDuration > 0 ? formatTime(trackDuration) : '--:--'}
              </span>
            </div>

            {/* Interactive Progress / Scrubber Bar */}
            <div
              ref={progressBarRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative w-full h-6 flex items-center cursor-pointer group touch-none"
              role="slider"
              aria-valuemin={0}
              aria-valuemax={trackDuration || 180}
              aria-valuenow={Math.round(displayedTime)}
              title="Arrastrá o hacé clic para avanzar o atrasar la canción"
            >
              {/* Background Track */}
              <div className="w-full h-2.5 bg-[#EAE3D5] rounded-full overflow-hidden border border-[#DDD5C5] relative">
                <div
                  className="h-full bg-gradient-to-r from-[#FF5722] via-[#E11D48] to-[#F59E0B] rounded-full shadow-[0_0_8px_#FF5722]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Scrubber Knob / Handle */}
              <div
                className="absolute w-4 h-4 bg-white border-2 border-[#FF5722] rounded-full shadow-md -translate-x-1/2 transition-transform duration-75 scale-90 group-hover:scale-125 group-active:scale-125 pointer-events-none"
                style={{ left: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Manual URL & Local File drawer (if open) */}
      {showManualInput && (
        <div className="p-3 mb-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] space-y-2 relative z-10">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadMedia(url)}
              placeholder="Pegá enlace de YouTube o Spotify"
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-[#EAE3D5] text-[#181226] placeholder:text-[#8E869E] focus:outline-none focus:border-[#FF5722]"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => loadMedia(url)}
                className="arcade-btn-primary px-3.5 py-2 text-xs font-bold cursor-pointer rounded-xl"
              >
                Cargar URL
              </button>

              <label className="arcade-btn px-3 py-2 text-xs font-black flex items-center gap-1.5 cursor-pointer rounded-xl bg-white hover:bg-[#F3EFE6] text-[#181226] border border-[#DDD5C5]">
                <svg className="w-3.5 h-3.5 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>+ Archivo MP3/WAV</span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                  onChange={handleManualLocalUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <p className="text-[11px] text-[#6B6280] italic">
            Podés cargar un enlace web o un archivo de música descargado en tu compu (funciona 100% offline sin internet).
          </p>
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
            <span className="hidden sm:inline">Repetir Clip</span>
          </button>
          
          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#EAE3D5]">
            <button
              onClick={() => handleSkip(-10)}
              className="px-2 py-1.5 rounded-lg text-xs font-bold text-[#6B6280] hover:text-[#181226] hover:bg-[#EAE3D5] transition-colors cursor-pointer"
              title="Atrasar 10s"
            >
              -10s
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
                <span className="hidden sm:inline">Pausar</span>
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
                <span className="hidden sm:inline">Reproducir</span>
              </button>
            )}

            <button
              onClick={() => handleSkip(10)}
              className="px-2 py-1.5 rounded-lg text-xs font-bold text-[#6B6280] hover:text-[#181226] hover:bg-[#EAE3D5] transition-colors cursor-pointer"
              title="Adelantar 10s (saltear intro)"
            >
              +10s
            </button>

            {startTime > 0 && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF5722]/10 text-[#FF5722] border border-[#FF5722]/20"
                title={`Punto de inicio del clip: ${formatTime(startTime)}`}
              >
                @{formatTime(startTime)}
              </span>
            )}
          </div>

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
