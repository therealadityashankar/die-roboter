import React from 'react';

type RobotKey = 'lekiwi' | 'so101';

interface ControlPanelProps {
  activeRobot: RobotKey;
  onRobotChange: (key: RobotKey) => void;
  isPanelOpen: boolean;
  onTogglePanel: () => void;
}

const robotButtonBase =
  'px-3 py-1 text-xs bg-transparent text-gray-800 border rounded cursor-pointer ml-2 transition-colors';

const getRobotButtonClasses = (activeRobot: RobotKey, key: RobotKey) =>
  `${robotButtonBase} ${activeRobot === key ? 'border-gray-800' : 'border-gray-300'}`;

export const ControlPanel: React.FC<ControlPanelProps> = ({
  activeRobot,
  onRobotChange,
  isPanelOpen,
  onTogglePanel,
}) => {
  return (
    <div
      id="control-panel"
      className={`absolute bottom-0 right-0 w-96 transition-transform duration-300 ease-in-out transform bg-gray-100 flex flex-col ${
        isPanelOpen ? 'h-full' : ''
      }`}
    >
      <div
        id="panel-content"
        className={`flex-1 p-4 overflow-y-auto bg-gray-100 border border-[var(--color-gray-300)] border-b-0 ${
          isPanelOpen ? '' : 'hidden'
        }`}
      >
        <div id="level-selector" />

        <div className="flex justify-between items-center mb-3">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold mr-4">Robot</h3>
            <div className="flex gap-2" aria-label="robot-switch">
              <button
                id="btn-lekiwi"
                className={getRobotButtonClasses(activeRobot, 'lekiwi')}
                onClick={() => onRobotChange('lekiwi')}
                type="button"
              >
                LeKiwi (default)
              </button>
              <button
                id="btn-so101"
                className={getRobotButtonClasses(activeRobot, 'so101')}
                onClick={() => onRobotChange('so101')}
                type="button"
              >
                SO101
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 my-3" />

        <div className="flex items-center justify-between mt-4 mb-1">
          <h3 className="text-lg font-semibold">Motion</h3>
          <div id="joint-tab-container" className="flex gap-2 justify-end" />
        </div>
        <div
          id="joint-sliders-active"
          className="flex flex-col gap-2.5 p-2.5 bg-transparent rounded-lg max-h-96 overflow-y-auto"
          role="region"
          aria-label="joint_sliders"
        />

        <div className="text-xs text-gray-600 mt-4 leading-normal border-t border-gray-200 pt-4" aria-label="attribution">
          Burger bun 3D model:
          <a
            href="https://sketchfab.com/3d-models/burger-bun-bread-1eb53bef512a48e5b61e934748201d4e"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 no-underline hover:underline"
          >
            Burger bun bread (Sketchfab)
          </a>
          <br />
          Burger patty 3D model:
          <a
            href="https://sketchfab.com/3d-models/cooked-burger-patty-meatball-fdeae6bf467f4ec2a42147cf877365c3"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 no-underline hover:underline"
          >
            Cooked burger patty / meatball (Sketchfab)
          </a>
          <br />
          Grass 3D model by MauroGonzalezA:
          <a
            href="https://sketchfab.com/3d-models/grass-4b800e07ea3543e3870ad5e53b39d825"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 no-underline hover:underline"
          >
            Grass (Sketchfab)
          </a>
          <br />
          Mango tree 3D model by stealth86:
          <a
            href="https://sketchfab.com/3d-models/mango-tree-4b186052228d43d8b3fbb63213677de8"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 no-underline hover:underline"
          >
            Mango tree (Sketchfab)
          </a>
          <br />
          Table 3D model by Silver10211:
          <a
            href="https://sketchfab.com/3d-models/table-a28843f21d784fe98cc220ef0d1df478"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 no-underline hover:underline"
          >
            Table (Sketchfab)
          </a>
        </div>
      </div>

      <button
        id="panel-toggle"
        className="btn btn-outline btn-sm rounded-none rounded-br-sm border-[var(--color-gray-300)] w-96 cursor-pointer flex items-center justify-between bg-transparent"
        type="button"
        onClick={onTogglePanel}
      >
        <h2>Controls</h2>
        <svg
          id="chevron-icon"
          className={`w-4 h-4 text-black transition-transform duration-300 ${isPanelOpen ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};