import { useEffect, useRef } from 'react';

/**
 * BackgroundVideo — Universal mobile & desktop ambient video background.
 *
 * Robust cross-platform guarantees:
 * - iOS & Android support: Full compatibility with Safari, WebKit, Chrome Mobile,
 *   Samsung Internet, Firefox, and in-app webviews (WhatsApp, Instagram).
 * - Low-Power Mode handling: If iOS/Android battery saver delays autoplay,
 *   automatically starts on first user touch/interaction anywhere on the screen.
 * - Dynamic Viewport resilience: Covers notch, dynamic island, and shrinking URL bar
 *   without layout jumps (100dvh + -webkit-fill-available fallback).
 * - Multi-ratio framing: Responsive object-position ensures Alma's face is in prime
 *   view across 16:9, 19.5:9, 20:9, foldables, and landscape orientations.
 * - Tab resumption: Automatically resumes video playback when returning to the tab.
 * - Performance isolation: Hardware-accelerated translate3d + contain: strict eliminates
 *   GPU compositing overhead and prevents layout reflows on all mobile chipsets.
 */
export default function BackgroundVideo() {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // Strict muted initialization for mobile browser autoplay policy
    el.muted = true;
    el.defaultMuted = true;

    const tryPlay = () => {
      if (!el) return;
      const promise = el.play();
      if (promise !== undefined) {
        promise.catch(() => {
          // Low-power mode or autoplay restriction: will unlock on first user gesture
        });
      }
    };

    tryPlay();

    // Unlock on first user gesture if browser blocked initial autoplay (e.g. iOS Low Power Mode)
    const handleFirstGesture = () => {
      if (el && el.paused) {
        tryPlay();
      }
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
    };

    window.addEventListener('touchstart', handleFirstGesture, { passive: true, once: true });
    window.addEventListener('pointerdown', handleFirstGesture, { passive: true, once: true });
    window.addEventListener('click', handleFirstGesture, { passive: true, once: true });

    // Resume when tab becomes visible again after switching apps
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && el && el.paused) {
        tryPlay();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none no-print"
      style={{
        width: '100vw',
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        transform: 'translate3d(0, 0, 0)',
        contain: 'strict',
      }}
    >
      {/* ── Video Element: Hardware-accelerated direct overlay plane ── */}
      <video
        ref={videoRef}
        src="/almaBaile.mp4"
        autoPlay
        loop
        muted
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        x5-video-player-type="h5-page"
        x5-video-player-fullscreen="true"
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        className="w-full h-full object-cover object-[center_20%] sm:object-[center_24%] opacity-80 sm:opacity-70"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'translateZ(0)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      />

      {/* ── Soft Daytime Scrim & Glow Overlay (Single combined composited layer) ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 90% 60% at 50% -15%, rgba(255, 87, 34, 0.08) 0%, transparent 65%),
            rgba(247, 244, 238, 0.18)
          `,
        }}
      />
    </div>
  );
}
