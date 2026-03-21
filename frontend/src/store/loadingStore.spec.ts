/**
 * LoadingStore tests. Validates loading readiness and QA metric fields.
 */
import { beforeEach } from 'vitest';
import { useLoadingStore } from './loadingStore';

describe('loadingStore', () => {
  beforeEach(() => {
    useLoadingStore.setState({
      soundsReady: false,
      platformReady: false,
      socketReady: false,
      loadStartMs: null,
      loadEndMs: null,
    });
  });

  it('allReady returns false when any resource not ready', () => {
    useLoadingStore.setState({ soundsReady: true, platformReady: true });
    expect(useLoadingStore.getState().allReady()).toBe(false);
  });

  it('allReady returns true when all resources ready', () => {
    useLoadingStore.setState({ soundsReady: true, platformReady: true, socketReady: true });
    expect(useLoadingStore.getState().allReady()).toBe(true);
  });

  it('loadingTimeMs returns null when load not complete', () => {
    useLoadingStore.setState({ loadStartMs: 1000 });
    expect(useLoadingStore.getState().loadingTimeMs()).toBeNull();
  });

  it('loadingTimeMs returns duration when load complete', () => {
    useLoadingStore.setState({ loadStartMs: 1000, loadEndMs: 2500 });
    expect(useLoadingStore.getState().loadingTimeMs()).toBe(1500);
  });
});
