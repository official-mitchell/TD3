/**
 * Loading readiness store. Tracks when all critical resources are loaded:
 * platform, socket, sounds. Loading overlay stays visible until allReady.
 * QA metrics: loadStartMs, loadEndMs reported to backend.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface LoadingState {
  soundsReady: boolean;
  platformReady: boolean;
  socketReady: boolean;
  loadStartMs: number | null;
  loadEndMs: number | null;
  setSoundsReady: (v: boolean) => void;
  setPlatformReady: (v: boolean) => void;
  setSocketReady: (v: boolean) => void;
  setLoadStart: (ms: number) => void;
  setLoadEnd: (ms: number) => void;
  allReady: () => boolean;
  loadingTimeMs: () => number | null;
}

export const useLoadingStore = create<LoadingState>()(
  devtools(
    (set, get) => ({
      soundsReady: false,
      platformReady: false,
      socketReady: false,
      loadStartMs: null,
      loadEndMs: null,

      setSoundsReady: (v) => set({ soundsReady: v }),
      setPlatformReady: (v) => set({ platformReady: v }),
      setSocketReady: (v) => set({ socketReady: v }),
      setLoadStart: (ms) => set({ loadStartMs: ms }),
      setLoadEnd: (ms) => set({ loadEndMs: ms }),

      allReady: () => {
        const s = get();
        return s.soundsReady && s.platformReady && s.socketReady;
      },
      loadingTimeMs: () => {
        const { loadStartMs, loadEndMs } = get();
        if (loadStartMs != null && loadEndMs != null) return loadEndMs - loadStartMs;
        return null;
      },
    }),
    { name: 'Loading Store' }
  )
);
