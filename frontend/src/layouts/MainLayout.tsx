import React from 'react';
import { Navbar } from '@components/platform/Navbar';
import { StatusCards } from '../components/platform/StatusCards';
// import { PlatformHeader } from '@components/platform/PlatformHeader';
// import { ActionButtons } from '@components/ui/ActionButtons';
import { PriorityTargetPanel } from '@components/platform/PriorityTargetPanel';
import { RadarDisplay } from '@components/radar/RadarDisplay';
import { LogPanel } from '@components/logs/LogPanel';

const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-slate-900 text-white">
      {/* Navbar */}
      <Navbar />

      {/* Status Cards */}
      <StatusCards />

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-13rem)]">
          {/* Left: Priority Targets */}
          <div className="col-span-3 h-full">
            <PriorityTargetPanel />
          </div>

          {/* Center: Radar Display */}
          <div className="col-span-6 h-full">
            <div className="bg-slate-800/80 rounded-lg p-4 h-full">
              <RadarDisplay />
            </div>
          </div>

          {/* Right: Logs */}
          <div className="col-span-3 h-full">
            {/* <div className="bg-slate-800/80 rounded-lg p-4 h-full"> */}
            <LogPanel />
            {/* </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;

// interface MainLayoutProps {
//   children?: React.ReactNode;
// }

// const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
//   return (
//     <div className="min-h-screen w-full bg-slate-900 text-white">
//       {/* Max Width Container */}
//       <div className="max-w-[1920px] mx-auto p-4 flex flex-col h-screen">
//         {/* Top Bar with Platform Status */}
//         <header className="flex items-start justify-between gap-4 h-24">
//           <div className="flex-1">
//             <PlatformHeader />
//           </div>
//           <ActionButtons />
//         </header>

//         {/* Main Content Area */}
//         <main className="flex-1 grid grid-cols-12 gap-4 my-4 min-h-0">
//           {/* Left Panel - Priority Targets */}
//           <section className="col-span-3 flex flex-col gap-4 overflow-auto">
//             <PriorityTargetPanel />
//           </section>

//           {/* Center Panel - Radar Display */}
//           <section className="col-span-6 flex flex-col gap-4">
//             <RadarDisplay />
//           </section>

//           {/* Right Panel - Logs */}
//           <section className="col-span-3 flex flex-col gap-4 overflow-auto">
//             <LogPanel />
//           </section>
//         </main>

//         {/* Status Footer */}
//         <footer className="h-12 px-4 py-2 bg-slate-800 rounded-lg">
//           <div className="text-sm text-slate-400">
//             System Status: Online | Last Update:{' '}
//             {new Date().toLocaleTimeString()}
//           </div>
//         </footer>
//       </div>
//     </div>
//   );
// };

// export default MainLayout;
