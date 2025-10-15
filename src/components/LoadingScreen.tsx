import React from 'react';
import { Bot, Cpu, Cog, Zap, Box, Grid3x3, Orbit, CircuitBoard } from 'lucide-react';
import type { MainSceneProgress } from '../types/scene';

interface LoadingScreenProps {
  progress: MainSceneProgress | null;
}

const formatPercent = (value: number | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0%';
  return `${Math.min(100, Math.max(0, value)).toFixed(0)}%`;
};

// Floating icons component
const FloatingIcons: React.FC = () => {
  const icons = [Bot, Cpu, Cog, Zap, Box, Grid3x3, Orbit, CircuitBoard];
  const positions = [
    { left: '5%', delay: 0, duration: 8 },
    { left: '15%', delay: 1, duration: 10 },
    { left: '25%', delay: 2, duration: 7 },
    { left: '35%', delay: 0.5, duration: 9 },
    { left: '45%', delay: 1.5, duration: 8.5 },
    { left: '55%', delay: 2.5, duration: 7.5 },
    { left: '65%', delay: 0.8, duration: 9.5 },
    { left: '75%', delay: 1.8, duration: 8.8 },
    { left: '85%', delay: 2.3, duration: 7.8 },
    { left: '95%', delay: 1.2, duration: 9.2 },
    { left: '10%', delay: 3, duration: 10.5 },
    { left: '30%', delay: 3.5, duration: 8.2 },
    { left: '50%', delay: 4, duration: 9.8 },
    { left: '70%', delay: 4.5, duration: 7.2 },
    { left: '90%', delay: 5, duration: 8.9 },
  ];

  const [iconStates, setIconStates] = React.useState<number[]>(
    positions.map((_, i) => i % icons.length)
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setIconStates(prev => prev.map(() => Math.floor(Math.random() * icons.length)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {positions.map((pos, i) => {
        const Icon = icons[iconStates[i]];
        return (
          <div
            key={i}
            className="absolute opacity-15"
            style={{
              left: pos.left,
              animation: `fall ${pos.duration}s linear infinite`,
              animationDelay: `${pos.delay}s`,
            }}
          >
            <Icon size={48} strokeWidth={1.5} />
          </div>
        );
      })}
      <style>{`
        @keyframes fall {
          0% { 
            top: -5%;
            transform: rotate(0deg);
          }
          100% { 
            top: 105%;
            transform: rotate(360deg);
          }
        }
        @keyframes robotHead {
          0% { transform: rotate(0deg) translateY(0); }
          10% { transform: rotate(30deg) translateY(0); }
          20% { transform: rotate(0deg) translateY(0); }
          30% { transform: rotate(-30deg) translateY(0); }
          40% { transform: rotate(0deg) translateY(0); }
          50% { transform: rotate(360deg) translateY(0); }
          60% { transform: rotate(0deg) translateY(0); }
          70% { transform: rotate(0deg) translateY(-10px); }
          75% { transform: rotate(0deg) translateY(0); }
          80% { transform: rotate(0deg) translateY(-5px); }
          85% { transform: rotate(0deg) translateY(0); }
          100% { transform: rotate(0deg) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress }) => {
  const percent = progress ? Math.round(progress.percent) : 0;
  const remainingAssets = progress?.remainingAssets ?? [];
  const loadedCount = progress?.loadedAssets ?? 0;
  const total = progress?.totalAssets ?? 0;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-900 z-50">
      <FloatingIcons />
      <div className="relative w-full max-w-md bg-white rounded-lg border border-black">
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center gap-4">
            <Bot size={48} strokeWidth={2} className="text-gray-900 flex-shrink-0" style={{ animation: 'robotHead 6s ease-in-out infinite' }} />
            <div className="flex flex-col">
              <h2 className="text-2xl font-semibold quicksand text-gray-900">Preparing Die Roboter</h2>
              <p className="text-sm text-gray-600 mt-1 quicksand">Loading simulation assets. Please hold tight.</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-black"></div>
        
        <div className="px-8 pt-6 pb-8">

          <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center justify-between text-sm text-gray-700 quicksand">
            <span>Overall progress</span>
            <span>{formatPercent(progress?.percent)}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          </div>

          <div className="text-sm text-gray-700 mb-4 quicksand">
          <div className="flex justify-between">
            <span>Assets loaded</span>
            <span>
              {loadedCount} / {total}
            </span>
          </div>
          {progress?.currentAsset ? (
            <div className="mt-2">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1 quicksand">Currently loading</p>
              <div className="flex items-center justify-between quicksand">
                <span className="font-medium text-gray-900">{progress.currentAsset}</span>
                <span>{formatPercent(progress.currentAssetPercent)}</span>
              </div>
            </div>
          ) : null}
          </div>

          <div className="border-t border-black mb-4"></div>

          {remainingAssets.length > 0 ? (
            <div className="text-xs text-gray-600 quicksand">
              <p className="uppercase tracking-wide mb-2 quicksand">Remaining</p>
              <ul className="space-y-1 max-h-32 overflow-y-auto pr-2">
                {remainingAssets.map((asset) => (
                  <li key={asset} className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
                    <span>{asset}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-gray-600 text-center quicksand">Finalizing scene...</p>
          )}
        </div>
      </div>
    </div>
  );
};
