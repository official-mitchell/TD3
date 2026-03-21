/**
 * App root. useSocket mounted at top level per 4.4.1. RouterProvider per 5.4.1.
 * useLoadingReady: preloads sounds, coordinates loading overlay, reports QA metrics.
 */
import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useLoadingReady } from '../hooks/useLoadingReady';
import { router } from '../router';

const App: React.FC = () => {
  useSocket();
  useLoadingReady();
  return <RouterProvider router={router} />;
};

export default App;
