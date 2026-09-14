import { useEffect, useRef } from 'react';

/**
 * Custom hook to keep the device screen on during gameplay using the Screen Wake Lock API.
 * Automatically re-acquires the lock on visibilitychange (e.g. if the user switches apps and returns).
 *
 * @param {boolean} enabled - Whether the wake lock should be active. Defaults to true.
 */
export function useWakeLock(enabled = true) {
  const wakeLockRef = useRef(null);

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    let isMounted = true;

    async function requestLock() {
      try {
        if (!wakeLockRef.current && document.visibilityState === 'visible') {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch (err) {
        // Can be rejected due to low battery or background tab, fail gracefully
        console.debug('Screen Wake Lock error (non-fatal):', err);
      }
    }

    requestLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);
}
