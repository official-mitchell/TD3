/**
 * App entry. Per Implementation Plan 5.4.1.
 * ThemeProvider, CssBaseline, RouterProvider. JetBrains Mono imported for typography.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import '@fontsource/jetbrains-mono';
import { td3Theme } from './theme';
import App from './app/app';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={td3Theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
