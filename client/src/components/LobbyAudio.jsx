import { useState, useEffect, useRef } from 'react';

/**
 * LobbyAudio — Plays "almaCancion.mp3" during the pre-game lobby.
 *
 * Rules:
 * - Plays only while players join and BEFORE the match starts.
 * - Shuts down completely when the match begins (isGameStarted === true).
 * - Compact & responsive: Fits on 320px/360px mobile viewports without wrapping issues.
 * - Handles browser autoplay policies on all mobile browsers (iOS Safari, Android Chrome, Samsung Internet).
 */
export default function LobbyAudio({
  isGameStarted = false,
  autoPlay = true,
  initialVolume = 0.6,
  className = '',
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);

  // Initialize audio instance
  useEffect(() => {
    const audio = new Audio('/almaCancion.mp3');
    audio.loop = true;
    audio.volume = initialVolume;
    audioRef.current = audio;

    audio.onplay = () => {
      setIsPlaying(true);
      setNeedsUserGesture(false);
    };
    audio.onpause = () => setIsPlaying(false);

    if (autoPlay && !isGameStarted) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setNeedsUserGesture(false);
          })
          .catch(() => {
            // Autoplay blocked by browser policy until user touches screen
            setNeedsUserGesture(true);
            setIsPlaying(false);
          });
      }
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    };
  }, [autoPlay, initialVolume, isGameStarted]);

  // Stop completely when game starts
  useEffect(() => {
    if (isGameStarted && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isGameStarted]);

  // Toggle play / pause
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setNeedsUserGesture(false);
        })
        .catch((err) => {
          console.warn('Lobby music playback failed:', err);
        });
    }
  };

  // Toggle mute
  const toggleMute = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  };

  // If match has already started, do not render anything
  if (isGameStarted) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 select-none shrink-0 ${className}`}>
      {needsUserGesture ? (
        <button
          onClick={togglePlay}
          className="arcade-btn-primary px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md animate-pulse"
          title="Activar música de fondo de Alma"
        >
          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span>Música Alma</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-white/95 border border-[#E0D9CB] shadow-xs backdrop-blur-xs">
          {/* Animated Equalizer Visualizer (Strictly constrained within container) */}
          <div className="flex items-end gap-0.5 h-3.5 w-3.5 sm:w-4 overflow-hidden shrink-0">
            <span
              className={`w-1 rounded-full bg-[#FF5722] ${
                isPlaying && !isMuted ? 'mini-eq-1' : 'h-1'
              }`}
            />
            <span
              className={`w-1 rounded-full bg-[#E11D48] ${
                isPlaying && !isMuted ? 'mini-eq-2' : 'h-2'
              }`}
            />
            <span
              className={`w-1 rounded-full bg-[#059669] ${
                isPlaying && !isMuted ? 'mini-eq-3' : 'h-1'
              }`}
            />
          </div>

          <button
            onClick={togglePlay}
            className="text-[11px] sm:text-xs font-bold text-[#181226] hover:text-[#FF5722] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Canción Alma</span>
          </button>

          {/* Mute toggle button */}
          <button
            onClick={toggleMute}
            className="p-0.5 sm:p-1 text-[#746B8A] hover:text-[#181226] rounded-md transition-colors cursor-pointer"
            title={isMuted ? 'Desmutear' : 'Silenciar'}
          >
            {isMuted ? (
              <svg className="w-3.5 h-3.5 text-[#E11D48]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
