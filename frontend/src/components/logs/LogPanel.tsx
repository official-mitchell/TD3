import React from 'react';
import { EngagementLogCard, UpdateLogCard } from './LogEntries';

// interface LogEntry {
//   timestamp: string;
//   droneId: string;
//   droneType: string;
//   status: string;
//   distance: number;
//   bearing: number;
//   direction: string;
// }

// const LogContainer: React.FC<{
//   title: string;
//   entries: LogEntryData[];
//   // entries: LogEntry[];
// }> = ({ title, entries }) => (
//   <div className="flex flex-col h-full bg-slate-800/80 rounded-lg p-4">
//     <h2 className="text-lg font-bold mb-4">{title}</h2>
//     <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
//       {entries.map((entry, i) => (
//         <LogEntry key={i} entry={entry} />
//       ))}
//       {/* {entries.map((entry, i) => (
//         <div key={i} className="p-3 bg-slate-700/50 rounded text-sm">
//           <div className="text-slate-400">{entry.timestamp}</div>
//           <div>
//             {entry.droneType} | {entry.droneId} {entry.status}
//           </div>
//           <div className="text-slate-300">
//             Distance: {entry.distance}km | Bearing: {entry.bearing}°{' '}
//             {entry.direction}
//           </div>
//         </div>
//       ))} */}
//     </div>
//   </div>
// );

export const LogPanel: React.FC = () => {
  // Mock data - would come from a store
  // const engagementLogs: LogEntry[] = [
  const engagementLogs: EngagementLogEntry[] = [
    {
      timestamp: '2024.11.14 • 10:44:01 AM',
      droneId: 'FIXED-001',
      droneType: 'Fixed Wing',
      status: 'ENGAGED',
      distance: 0.53,
      bearing: 71.7,
      direction: 'E',
      altitude: 412.4,
      speed: 132.7,
      position: {
        lat: 37.771735,
        lng: -122.428407,
      },
      threatLevel: 4,
      inRange: true,
    },
  ];

  const updateLogs: UpdateLogEntry[] = [
    {
      timestamp: '2024.11.14 • 10:44:01 AM',
      droneId: 'FIXED-001',
      droneType: 'Fixed Wing',
      status: 'DETECTED',
      distance: 0.53,
      bearing: 71.7,
      direction: 'E',
      position: {
        lat: 37.771735,
        lng: -122.428407,
      },
    },
  ];

  return (
    <div className="grid grid-rows-2 gap-4 h-full">
      <div className="h-full min-h-0">
        <div className="flex flex-col h-full bg-slate-800/80 rounded-lg p-4 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">Engagement Log</h2>
          <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            {engagementLogs.map((entry, i) => (
              <EngagementLogCard key={i} entry={entry} />
            ))}
          </div>
        </div>
      </div>

      <div className="h-full min-h-0">
        <div className="flex flex-col h-full bg-slate-800/80 rounded-lg p-4 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">Update Log</h2>
          <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            {updateLogs.map((entry, i) => (
              <UpdateLogCard key={i} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// original implementation

// export const LogPanel: React.FC = () => {
//   return (
//     <div className="bg-slate-800 p-4 rounded-lg h-full">
//       <h2 className="text-lg font-bold mb-4">System Logs</h2>
//       <div className="space-y-2 h-[calc(100%-2rem)] overflow-auto">
//         {[1, 2, 3, 4, 5].map((i) => (
//           <div key={i} className="p-2 bg-slate-700 rounded text-sm">
//             <div className="text-slate-400">
//               2024.11.14 • 10:44:{i.toString().padStart(2, '0')} AM
//             </div>
//             <div>Fixed Wing | FIXED-001 IDENTIFIED</div>
//             <div className="text-slate-300">
//               Distance: 0.53km | Bearing: 71.7° E
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };
