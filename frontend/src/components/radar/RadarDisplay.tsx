export const RadarDisplay: React.FC = () => {
  return (
    <div className="bg-slate-800 p-4 rounded-lg h-full flex items-center justify-center">
      <div className="relative w-96 h-96">
        <div className="absolute inset-0 border-2 border-green-500 rounded-full"></div>
        <div className="absolute inset-4 border border-green-500/50 rounded-full"></div>
        <div className="absolute inset-8 border border-green-500/30 rounded-full"></div>
        {/* Placeholder for actual radar implementation */}
        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-green-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>
    </div>
  );
};
