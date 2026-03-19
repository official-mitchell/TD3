/**
 * Router configuration. Per Implementation Plan 5.3.
 * / redirects to /dashboard; /history commented out for stretch phase.
 */
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardView } from './views/DashboardView';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/dashboard',
    element: <DashboardView />,
  },
  // { path: '/history', element: <HistoryView /> }, // stretch phase placeholder
]);
