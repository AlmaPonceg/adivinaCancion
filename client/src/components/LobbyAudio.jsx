import { useState, useEffect } from 'react';
import { lobbyAudioManager } from '../utils/lobbyAudio';

/**
 * LobbyAudio — Plays "almaCancion.mp3" during the pre-game lobby.
 *
 * Rules:
 * - Plays only while players join and BEFORE the match starts.
 * - Shuts down completely when the match begins (isGameStarted === true).
 * - Connected to lobbyAudioManager singleton to support seamless playback from mobile join gesture.
 * - Automatically hooks into any screen touch/click if autoplay was deferred.
 */
export default function LobbyAudio({
  isGameStarted = false,
  autoPlay = true,
  initialVolume = 0.35,
  className = '',
}) {
  const [isPlaying, setIsPlaying] = useState(() => lobbyAudioManager.isPlaying);
  const [isMuted, setIsMuted] = useState(() => lobbyAudioManager.isMuted);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);

  useEffect(() => {
    // Sync state with singleton manager
    const unsubscribe = lobbyAudioManager.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setIsMuted(state.isMuted);
      if (state.isPlaying) {
        setNeedsUserGesture(false);
      }
    });

    if (!isGameStarted && autoPlay) {
      if (!lobbyAudioManager.isPlaying) {
        const playPromise = lobbyAudioManager.play(initialVolume);
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setNeedsUserGesture(false);
            })
            .catch(() => {
              setNeedsUserGesture(true);

              // Auto-play on the very first touch/click anywhere on the screen
              const onFirstInteraction = () => {
                lobbyAudioManager.unlockAndPlay(initialVolume);
                window.removeEventListener('touchstart', onFirstInteraction);
                window.removeEventListener('click', onFirstInteraction);
              };
              window.addEventListener('touchstart', onFirstInteraction, { once: true });
              window.addEventListener('click', onFirstInteraction, { once: true });
            });
        }
      } else {
        setIsPlaying(true);
        setNeedsUserGesture(false);
      }
    }

    return () => {
      unsubscribe();
    };
  }, [autoPlay, initialVolume, isGameStarted]);

  // Stop completely when game starts
  useEffect(() => {
    if (isGameStarted) {
      lobbyAudioManager.stop();
      setIsPlaying(false);
    }
  }, [isGameStarted]);

  // Toggle play / pause
  const togglePlay = () => {
    lobbyAudioManager.togglePlay(initialVolume);
  };

  // Toggle mute
  const toggleMute = (e) => {
    e.stopPropagation();
    lobbyAudioManager.toggleMute();
  };

  // If match has already started, do not render anything
  if (isGameStarted) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 select-none shrink-0 ${className}`}>
      {needsUserGesture && !isPlaying ? (
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
        <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-white border border-[#E0D9CB] shadow-xs">
          {/* Animated Equalizer Visualizer */}
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
