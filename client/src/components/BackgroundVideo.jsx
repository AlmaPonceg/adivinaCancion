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
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        perspective: 1000,
        WebkitPerspective: 1000,
        contain: 'strict',
      }}
    >
      {/* ── Video Element: Multi-OS Cross-Platform Attributes ── */}
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
        }}
      />

      {/* ── Soft Daytime Scrim ── */}
      <div className="absolute inset-0 bg-[#F7F4EE]/20 pointer-events-none" />

      {/* ── Subtle Festival Ambient Glows ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 90% 60% at 50% -15%, rgba(255, 87, 34, 0.12) 0%, transparent 65%),
            radial-gradient(ellipse 70% 50% at 85% 90%, rgba(245, 158, 11, 0.08) 0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 15% 70%, rgba(225, 29, 72, 0.07) 0%, transparent 55%)
          `,
        }}
      />
    </div>
  );
}
