/**
 * App root. useSocket mounted at top level per 4.4.1. RouterProvider per 5.4.1.
 */
import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { router } from '../router';

const App: React.FC = () => {
  useSocket();
  return <RouterProvider router={router} />;
};
