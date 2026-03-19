/**
 * Header bar. Per Implementation Plan 6.2.1.
 * Renders Navbar (existing content) for layout cleanup. Fixed height, full width.
 */
import React from 'react';
import { Navbar } from '@components/platform/Navbar';

export const Header: React.FC = () => {
  return (
    <header className="h-14 flex-shrink-0 w-full bg-[#0F1929]">
      <Navbar />
    </header>
  );
}
