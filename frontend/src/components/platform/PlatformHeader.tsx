export const PlatformHeader: React.FC = () => {
  return (
    <div className="bg-slate-800 p-4 rounded-lg">
      <h1 className="text-xl font-bold">XM914E1 Platform Status</h1>
      <div className="flex gap-4 mt-2">
        <span className="px-2 py-1 bg-green-500 rounded text-sm">IDLE</span>
        <span>Kills Confirmed: 3</span>
        <span>Lat: 25.9053° | Lng: 51.5438° | Heading: 317.8°</span>
      </div>
    </div>
  );
};
