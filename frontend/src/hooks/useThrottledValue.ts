/**
 * Returns a throttled value that updates at most every `intervalMs`.
 * First value is immediate; subsequent updates are throttled.
 * When `resetKey` changes, updates immediately (e.g. when switching targets).
 */
import { useState, useEffect, useRef } from 'react';

export function useThrottledValue<T>(value: T, intervalMs: number, resetKey?: unknown): T {
  const [throttled, setThrottled] = useState(value);
  const lastUpdateRef = useRef(0);
  const pendingRef = useRef<T | null>(null);
  const prevResetKeyRef = useRef(resetKey);

  useEffect(() => {
    if (resetKey !== undefined && resetKey !== prevResetKeyRef.current) {
      prevResetKeyRef.current = resetKey;
      lastUpdateRef.current = 0;
    }

    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;

    if (elapsed >= intervalMs || lastUpdateRef.current === 0) {
      lastUpdateRef.current = now;
      pendingRef.current = null;
      setThrottled(value);
      return;
    } else {
      pendingRef.current = value;
      const remaining = intervalMs - elapsed;
      const id = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        setThrottled(pendingRef.current ?? value);
        pendingRef.current = null;
      }, remaining);
      return () => clearTimeout(id);
    }
  }, [value, intervalMs, resetKey]);

  return throttled;
}
