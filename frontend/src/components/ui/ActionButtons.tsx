export const ActionButtons: React.FC = () => {
  return (
    <div className="flex gap-2">
      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
        CREATE TESTS
      </button>
      <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded">
        CLEAR UPDATES
      </button>
    </div>
  );
};
