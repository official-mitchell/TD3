/**
 * Hamburger button with open/close animation (3 lines ↔ X).
 */
import React from 'react';

export const HamburgerButton: React.FC<{
  open: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  'aria-label'?: string;
  className?: string;
}> = ({ open, onClick, 'aria-label': ariaLabel = 'Menu', className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    aria-expanded={open}
    className={`w-10 h-10 flex flex-col items-center justify-center gap-1.5 p-2 ${className}`}
  >
    <span
      className="block w-5 h-0.5 bg-current rounded-full transition-all duration-200 origin-center"
      style={{
        transform: open ? 'rotate(45deg) translate(4px, 4px)' : 'none',
      }}
    />
    <span
      className="block w-5 h-0.5 bg-current rounded-full transition-all duration-200"
      style={{ opacity: open ? 0 : 1 }}
    />
    <span
      className="block w-5 h-0.5 bg-current rounded-full transition-all duration-200 origin-center"
      style={{
        transform: open ? 'rotate(-45deg) translate(4px, -4px)' : 'none',
      }}
    />
  </button>
);
