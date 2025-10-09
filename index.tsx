import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ControlPanel } from './components/controlPanel';

type RobotKey = 'lekiwi' | 'so101';

const App = () => {
  const [activeRobot, setActiveRobot] = useState<RobotKey>('lekiwi');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  useEffect(() => {
    import('./main.ts');
  }, []);

  return (
    <div className="bg-gray-100 w-screen h-screen">
      <div className="max-w-full mx-auto pt-5">
        <div className="mb-5">
          <h1 className="text-gray-800 text-center text-3xl quicksand mb-1">Die Roboter</h1>
          <p className="text-gray-600 text-center text-sm quicksand">a video game for robots</p>
        </div>

        <div className="relative w-full h-[calc(100vh-100px)]">
          <div className="w-full h-full rounded-sm">
            <div id="robot-view" className="w-full h-full bg-gray-100 rounded-lg overflow-hidden" />
          </div>

          <ControlPanel
            activeRobot={activeRobot}
            onRobotChange={setActiveRobot}
            isPanelOpen={isPanelOpen}
            onTogglePanel={() => setIsPanelOpen((prev) => !prev)}
          />
        </div>
      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
