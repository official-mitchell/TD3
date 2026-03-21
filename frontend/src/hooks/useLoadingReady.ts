/**
 * useLoadingReady. Coordinates loading readiness: preloads sounds, subscribes to platform/socket.
 * When all ready, records loadEndMs and reports QA metrics to backend.
 */
import { useEffect } from 'react';
import { usePlatformStore } from '../store/platformStore';
import { useConnectionStore } from '../store/connectionStore';
import { useLoadingStore } from '../store/loadingStore';
import { preloadSounds } from '../lib/preloadSounds';
import { getApiBaseUrl } from '../utils/constants';

const SESSION_KEY = 'td3_session_id';

function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID?.() ?? `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `sess-${Date.now()}`;
  }
}

export function useLoadingReady(): void {
  const platform = usePlatformStore((s) => s.platform);
  const connectionStatus = useConnectionStore((s) => s.status);
  const setSoundsReady = useLoadingStore((s) => s.setSoundsReady);
  const setPlatformReady = useLoadingStore((s) => s.setPlatformReady);
  const setSocketReady = useLoadingStore((s) => s.setSocketReady);
  const setLoadStart = useLoadingStore((s) => s.setLoadStart);
  const setLoadEnd = useLoadingStore((s) => s.setLoadEnd);
  const soundsReady = useLoadingStore((s) => s.soundsReady);
  const platformReady = useLoadingStore((s) => s.platformReady);
  const socketReady = useLoadingStore((s) => s.socketReady);
  const loadEndMs = useLoadingStore((s) => s.loadEndMs);
  const loadStartMs = useLoadingStore((s) => s.loadStartMs);

  const allReady = soundsReady && platformReady && socketReady;

  useEffect(() => {
    setLoadStart(performance.now());
  }, [setLoadStart]);

  useEffect(() => {
    preloadSounds().then(() => setSoundsReady(true));
  }, [setSoundsReady]);

  useEffect(() => {
    setPlatformReady(platform !== null);
  }, [platform, setPlatformReady]);

  useEffect(() => {
    setSocketReady(connectionStatus === 'Connected');
  }, [connectionStatus, setSocketReady]);

  useEffect(() => {
    if (!allReady || loadEndMs != null) return;
    const end = performance.now();
    const start = loadStartMs;
    setLoadEnd(end);

    if (start != null) {
      const duration = end - start;
      const sessionId = getOrCreateSessionId();
      fetch(`${getApiBaseUrl()}/api/qa/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          loadStartMs: start,
          loadEndMs: end,
          loadingTimeMs: duration,
        }),
      }).catch(() => {});
    }
  }, [allReady, loadEndMs, loadStartMs, setLoadEnd]);
}
