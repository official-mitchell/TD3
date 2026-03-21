/**
 * App root. useSocket mounted at top level per 4.4.1. RouterProvider per 5.4.1.
 * useLoadingReady: preloads sounds, coordinates loading overlay, reports QA metrics.
 * Per Implementation Plan Presentation 3.2.1: Shift+1/2/3 keyboard shortcuts.
 */
import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useLoadingReady } from '../hooks/useLoadingReady';
import { useUIStore } from '../store/uiStore';
import { router } from '../router';

const App: React.FC = () => {
  useSocket();
  useLoadingReady();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (!e.shiftKey) return;
      const { setMode, setDebugDrawer, debugDrawerOpen } = useUIStore.getState();
      if (e.key === '1') {
        e.preventDefault();
        setMode('operator');
        setDebugDrawer(false);
      } else if (e.key === '2') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('td3:capture-map-state'));
      } else if (e.key === '3') {
        e.preventDefault();
        const willOpen = !debugDrawerOpen;
        setDebugDrawer(willOpen);
        setMode(willOpen ? 'debug' : 'operator');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return <RouterProvider router={router} />;
};

export default App;
