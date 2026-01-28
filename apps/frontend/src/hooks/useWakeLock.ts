import { useEffect, useRef, useState } from 'react';

/**
 * A hook that requests a screen wake lock to prevent the device from sleeping.
 *
 * @param enabled Whether the wake lock should be active.
 * @returns An object containing the current wake lock state and error if any.
 */
export function useWakeLock(enabled: boolean) {
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    // If not enabled or Wake Lock API is not supported, do nothing
    if (!enabled || !('wakeLock' in navigator)) {
      return;
    }

    const requestLock = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        wakeLockRef.current = lock;
        setIsLocked(true);
        setError(null);

        // Listen for release (e.g. user switches tabs)
        lock.addEventListener('release', () => {
          setIsLocked(false);
          // Only clear ref here if we didn't initiate the release manually?
          // Actually, if it's released, we might want to know.
          // But if we are still enabled and it released (e.g. visibility change),
          // we should re-acquire when visible.
        });
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error('Failed to request wake lock'));
        }
        setIsLocked(false);
      }
    };

    const handleVisibilityChange = () => {
      // Re-acquire lock if page becomes visible and we should be locked
      if (document.visibilityState === 'visible' && enabled) {
        requestLock();
      }
    };

    // Request initial lock
    requestLock();

    // Re-acquire on visibility change (since lock is released on visibility hidden)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current
          .release()
          .catch((err) => console.error('Failed to release wake lock:', err));
        wakeLockRef.current = null;
      }
      setIsLocked(false);
    };
  }, [enabled]);

  return { isLocked, error };
}
