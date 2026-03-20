/**
 * Offline banner. Per Implementation Plan 14.6.1.
 * Fixed-position amber bar across full top of screen when connection is lost.
 */
import React from 'react';

export const OfflineBanner: React.FC = () => (
  <div
    className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center py-2 text-sm font-semibold text-amber-950 bg-amber-400"
    role="alert"
    aria-live="polite"
  >
    ⚠ CONNECTION LOST — DISPLAYING LAST KNOWN STATE
  </div>
);
