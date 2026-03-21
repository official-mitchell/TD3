/**
 * Router configuration. Per Implementation Plan 5.3, 3.3.
 * / redirects to /dashboard; /systems-view for Systems View. RootLayout syncs activeMode → route.
 */
import { createBrowserRouter, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { DashboardView } from './views/DashboardView';
import { SystemsView } from './views/SystemsView';
import { useUIStore } from './store/uiStore';

const RootLayout: React.FC = () => {
  const navigate = useNavigate();
  const activeMode = useUIStore((s) => s.activeMode);

  useEffect(() => {
    if (activeMode === 'systems-view') {
      navigate('/systems-view');
    } else if (activeMode === 'operator' || activeMode === 'debug') {
      navigate('/dashboard');
    }
  }, [activeMode, navigate]);

  return <Outlet />;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { path: 'dashboard', element: <DashboardView /> },
      { path: 'systems-view', element: <SystemsView /> },
    ],
  },
]);
