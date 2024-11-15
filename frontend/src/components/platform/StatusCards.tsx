import React from 'react';

interface PlatformStatus {
  weaponSystem: {
    name: string;
    unit: string;
  };
  position: {
    lat: number;
    lng: number;
  };
  bearing: number;
  status: {
    state: 'IDLE' | 'ACTIVE' | 'ENGAGING';
    kills: number;
  };
}

const StatusCard: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-cyan-400">★</span>
      <span className="text-sm text-slate-400">{title}</span>
    </div>
    {children}
  </div>
);

export const StatusCards: React.FC = () => {
  // This would eventually come from a store/context
  const status: PlatformStatus = {
    weaponSystem: {
      name: 'XM914E1',
      unit: '3rd Marine Brigade',
    },
    position: {
      lat: 37.7749,
      lng: -122.4194,
    },
    bearing: 317.8,
    status: {
      state: 'IDLE',
      kills: 3,
    },
  };

  return (
    <div className="grid grid-cols-4 gap-4 px-6">
      <StatusCard title="Weapon System">
        <div className="space-y-1">
          <div className="text-lg font-medium">{status.weaponSystem.name}</div>
          <div className="text-sm text-slate-400">
            {status.weaponSystem.unit}
          </div>
        </div>
      </StatusCard>

      <StatusCard title="Position">
        <div className="grid grid-rows-2 gap-1">
          <div className="text-sm">
            Lat: <span className="text-cyan-400">{status.position.lat}°</span>
          </div>
          <div className="text-sm">
            Lng: <span className="text-cyan-400">{status.position.lng}°</span>
          </div>
        </div>
      </StatusCard>

      <StatusCard title="Bearing">
        <div className="text-lg font-medium">{status.bearing}°</div>
      </StatusCard>

      <StatusCard title="Status">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`
              px-2 py-1 rounded text-xs font-medium
              ${
                status.status.state === 'IDLE'
                  ? 'bg-green-500'
                  : status.status.state === 'ACTIVE'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }
            `}
            >
              {status.status.state}
            </span>
          </div>
          <div className="text-sm text-slate-300">
            Kills Confirmed:{' '}
            <span className="text-cyan-400">{status.status.kills}</span>
          </div>
        </div>
      </StatusCard>
    </div>
  );
};
