import React, { useState } from 'react';

interface Target {
  id: string;
  type: 'Quadcopter' | 'Fixed Wing' | 'VTOL';
  modelId: string;
  distance: number;
  threatLevel: number; // 1-5 for star rating
  selected?: boolean;
}

const TargetCard: React.FC<{
  target: Target;
  index: number;
  selected: boolean;
  onSelect: () => void;
}> = ({ target, index, selected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={`
        p-4 rounded-lg cursor-pointer transition-all
        ${
          selected
            ? 'bg-slate-700 border-l-4 border-blue-500'
            : 'bg-slate-800 hover:bg-slate-700'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-blue-400">{index + 1}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-medium">{target.modelId}</span>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`text-sm ${
                    i < target.threatLevel
                      ? 'text-yellow-400'
                      : 'text-slate-600'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <div className="text-sm text-slate-400">{target.type}</div>
          <div className="text-sm text-slate-500 mt-1">
            DISTANCE AWAY: {target.distance.toFixed(2)}km
          </div>
        </div>
      </div>
    </div>
  );
};

export const PriorityTargetPanel: React.FC = () => {
  // This would eventually come from a store
  const [targets] = useState<Target[]>([
    {
      id: '1',
      type: 'Quadcopter',
      modelId: 'QUAD-001',
      distance: 0.91,
      threatLevel: 3,
    },
    {
      id: '2',
      type: 'Quadcopter',
      modelId: 'QUAD-002',
      distance: 0.91,
      threatLevel: 4,
    },
    {
      id: '3',
      type: 'Quadcopter',
      modelId: 'QUAD-003',
      distance: 0.91,
      threatLevel: 2,
    },
    {
      id: '4',
      type: 'Quadcopter',
      modelId: 'QUAD-004',
      distance: 0.91,
      threatLevel: 5,
    },
    {
      id: '5',
      type: 'Quadcopter',
      modelId: 'QUAD-005',
      distance: 0.91,
      threatLevel: 3,
    },
  ]);

  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(
    new Set()
  );

  const toggleTarget = (targetId: string) => {
    const newSelected = new Set(selectedTargets);
    if (newSelected.has(targetId)) {
      newSelected.delete(targetId);
    } else {
      newSelected.add(targetId);
    }
    setSelectedTargets(newSelected);
  };

  return (
    <div className="bg-slate-800/80 rounded-lg p-4 flex flex-col h-full border border-slate-700">
      <div className="mb-4">
        <h2 className="text-lg font-bold">Priority Targets</h2>
        <p className="text-sm text-slate-400">
          Click the card to select multiple
        </p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {targets.map((target, index) => (
          <TargetCard
            key={target.id}
            target={target}
            index={index}
            selected={selectedTargets.has(target.id)}
            onSelect={() => toggleTarget(target.id)}
          />
        ))}
      </div>

      <button
        className="w-full mt-4 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
        disabled={selectedTargets.size === 0}
      >
        FIRE ({selectedTargets.size})
      </button>
    </div>
  );
};
