/**
 * App root. useSocket mounted at top level per Implementation Plan 4.4.1.
 */
import React from 'react';
import MainLayout from '@layouts/MainLayout';
import { useSocket } from '../hooks/useSocket';

const App: React.FC = () => {
  useSocket();
  return <MainLayout />;
};

export default App;
