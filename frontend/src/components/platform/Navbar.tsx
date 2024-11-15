import React from 'react';
import { TD3Logo } from '../ui/TD3Logo';

export const Navbar: React.FC = () => {
  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-slate-800/50">
      <TD3Logo />
      <div className="flex gap-3">
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm">
          UPDATE PLATFORM
        </button>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm">
          CREATE TESTS
        </button>
        <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm">
          CLEAR UPDATES
        </button>
      </div>
    </nav>
  );
};

// src/components/platform/StatusCards.tsx
export const StatusCards: React.FC = () => {
  return (
    <div className="grid grid-cols-4 gap-4 px-6 py-4">
      <div className="bg-slate-800/80 rounded-lg p-4">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          <span className="text-sm">⭐ Weapon System</span>
        </div>
        <div className="text-lg font-semibold">XM914E1</div>
        <div className="text-sm text-slate-300">3rd Marine Brigade</div>
      </div>

      <div className="bg-slate-800/80 rounded-lg p-4">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          <span className="text-sm">⭐ Position</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Lat: 37.7749</div>
          <div>Lng: -122.4194</div>
        </div>
      </div>

      <div className="bg-slate-800/80 rounded-lg p-4">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          <span className="text-sm">⭐ Bearing</span>
        </div>
        <div className="text-lg">317.8°</div>
      </div>

      <div className="bg-slate-800/80 rounded-lg p-4">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          <span className="text-sm">⭐ Status</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-green-500 rounded text-sm">IDLE</span>
          <span className="text-sm">Kills Confirmed: 3</span>
        </div>
      </div>
    </div>
  );
};
