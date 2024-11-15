import React, { useState } from 'react';
import {
  ChevronDown,
  // ChevronUp,
  Plane,
  // Copter
} from 'lucide-react';

interface BaseLogEntry {
  timestamp: string;
  droneId: string;
  droneType: 'Fixed Wing' | 'Quadcopter' | 'VTOL';
  distance: number;
  bearing: number;
  direction: string;
  position: {
    lat: number;
    lng: number;
  };
}

//   original implementation
// interface LogEntryData {
//   timestamp: string;
//   droneId: string;
//   droneType: 'Fixed Wing' | 'Quadcopter' | 'VTOL';
//   status: string;
//   distance: number;
//   bearing: number;
//   direction: string;
//   altitude: number;
//   position: {
//     lat: number;
//     lng: number;
//   };
//   threatLevel: number; // 1-5
// }

interface EngagementLogEntry extends BaseLogEntry {
  status: 'IDENTIFIED' | 'ENGAGED' | 'DESTROYED';
  altitude: number;
  threatLevel: number;
}

interface UpdateLogEntry extends BaseLogEntry {
  status: 'DETECTED' | 'IDENTIFIED' | 'TRACKING';
  altitude: number;
  speed: number;
  inRange: boolean;
}

const DroneIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'Fixed Wing':
      return <Plane className="w-4 h-4 text-blue-400" />;
    case 'Quadcopter':
    case 'VTOL':
      return <Copter className="w-4 h-4 text-blue-400" />;
    default:
      return null;
  }
};

// const ThreatStars: React.FC<{ level: number }> = ({ level }) => (
//   <div className="flex">
//     {[...Array(5)].map((_, i) => (
//       <span
//         key={i}
//         className={`text-xs ${
//           i < level ? 'text-yellow-400' : 'text-slate-600'
//         }`}
//       >
//         ★
//       </span>
//     ))}
//   </div>
// );

export const EngagementLogCard: React.FC<{ entry: EngagementLogEntry }> = ({
  entry,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-700/50 rounded-lg overflow-hidden">
      <div
        className="p-3 cursor-pointer hover:bg-slate-700/70"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DroneIcon type={entry.droneType} />
            <span className="font-medium">{entry.droneType}</span>
            <span className="text-slate-400">|</span>
            <span className="text-cyan-400">{entry.droneId}</span>
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                entry.status === 'ENGAGED'
                  ? 'bg-yellow-600'
                  : entry.status === 'DESTROYED'
                  ? 'bg-red-600'
                  : 'bg-blue-600'
              }`}
            >
              {entry.status}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>

        <div className="text-xs text-slate-400 mt-1">{entry.timestamp}</div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-600/50">
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div>
                <span className="text-slate-400">Distance: </span>
                <span className="text-cyan-400">{entry.distance}km</span>
              </div>
              <div>
                <span className="text-slate-400">Bearing: </span>
                <span className="text-cyan-400">
                  {entry.bearing}° {entry.direction}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Alt: </span>
                <span className="text-cyan-400">{entry.altitude}m</span>
              </div>
              <div>
                <span className="text-slate-400">Position: </span>
                <span className="text-cyan-400">
                  {entry.position.lat}, {entry.position.lng}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const UpdateLogCard: React.FC<{ entry: UpdateLogEntry }> = ({
  entry,
}) => {
  return (
    <div className="bg-slate-700/50 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <DroneIcon type={entry.droneType} />
        <span className="font-medium">{entry.droneType}</span>
        <span className="text-slate-400">|</span>
        <span className="text-cyan-400">{entry.droneId}</span>
        <span
          className={`px-2 py-0.5 rounded text-xs ${
            entry.status === 'IDENTIFIED'
              ? 'bg-blue-600'
              : entry.status === 'TRACKING'
              ? 'bg-yellow-600'
              : 'bg-slate-600'
          }`}
        >
          {entry.status}
        </span>
      </div>

      <div className="text-xs text-slate-400 mt-1">{entry.timestamp}</div>

      {/* Details */}
      <div className="mt-2 grid grid-cols-2 gap-y-2 text-sm">
        <div>
          <span className="text-slate-400">Distance: </span>
          <span className="text-cyan-400">{entry.distance}km</span>
        </div>
        <div>
          <span className="text-slate-400">Bearing: </span>
          <span className="text-cyan-400">
            {entry.bearing}° {entry.direction}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Speed: </span>
          <span className="text-cyan-400">{entry.speed} km/h</span>
        </div>
        <div>
          <span className="text-slate-400">Alt: </span>
          <span className="text-cyan-400">{entry.altitude}m</span>
        </div>
      </div>

      <div className="mt-2 text-sm">
        <span className="text-slate-400">Position: </span>
        <span className="text-cyan-400">
          {entry.position.lat}, {entry.position.lng}
        </span>
      </div>

      {entry.inRange && (
        <div className="mt-2 text-sm text-green-400">
          ✓ Within Engagement Range
        </div>
      )}
    </div>
  );
};

// export const LogEntry: React.FC<{ entry: LogEntryData }> = ({ entry }) => {
//   const [isExpanded, setIsExpanded] = useState(false);

//   return (
//     <div className="bg-slate-700/50 rounded-lg overflow-hidden transition-all duration-200">
//       {/* Header - Always Visible */}
//       <div
//         className="p-3 cursor-pointer hover:bg-slate-700/70 flex items-center gap-2"
//         onClick={() => setIsExpanded(!isExpanded)}
//       >
//         <button className="text-slate-400">
//           {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
//         </button>

//         <DroneIcon type={entry.droneType} />

//         <div className="flex-1">
//           <div className="flex items-center gap-2">
//             <span className="text-sm font-medium">{entry.droneType}</span>
//             <span className="text-slate-400">|</span>
//             <span className="text-sm text-cyan-400">{entry.droneId}</span>
//             <span className="text-slate-400">{entry.status}</span>
//             <ThreatStars level={entry.threatLevel} />
//           </div>
//           <div className="text-xs text-slate-400">{entry.timestamp}</div>
//         </div>
//       </div>

//       {/* Expandable Content */}
//       {isExpanded && (
//         <div className="px-3 pb-3 pt-1 text-sm space-y-1 border-t border-slate-600/50">
//           <div className="grid grid-cols-2 gap-2">
//             <div className="text-slate-300">
//               Distance:{' '}
//               <span className="text-cyan-400">{entry.distance}km</span>
//             </div>
//             <div className="text-slate-300">
//               Bearing:{' '}
//               <span className="text-cyan-400">
//                 {entry.bearing}° {entry.direction}
//               </span>
//             </div>
//             <div className="text-slate-300">
//               Alt: <span className="text-cyan-400">{entry.altitude}m</span>
//             </div>
//             <div className="text-slate-300">
//               Speed: <span className="text-cyan-400">132.7 km/h</span>
//             </div>
//           </div>
//           <div className="text-slate-400 text-xs">
//             Position: {entry.position.lat}, {entry.position.lng}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };
