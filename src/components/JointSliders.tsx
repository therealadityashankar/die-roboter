import React, { useState, useEffect } from 'react';

export interface JointConfig {
  name: string;
  lower: number;
  upper: number;
  initialValue?: number;
}

interface JointSlidersProps {
  joints: JointConfig[];
  onJointChange?: (jointName: string, value: number) => void;
  onAllJointsChange?: (jointValues: Record<string, number>) => void;
}

export const JointSliders: React.FC<JointSlidersProps> = ({
  joints,
  onJointChange,
  onAllJointsChange,
}) => {
  const [jointValues, setJointValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    joints.forEach((joint) => {
      initial[joint.name] = joint.initialValue ?? 0;
    });
    return initial;
  });

  const [copiedState, setCopiedState] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleSliderChange = (jointName: string, value: number) => {
    setJointValues((prev) => {
      const updated = { ...prev, [jointName]: value };
      onAllJointsChange?.(updated);
      return updated;
    });
    onJointChange?.(jointName, value);
  };

  const handleCopyJSON = async () => {
    const payload = JSON.stringify(jointValues, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      setCopiedState('copied');
      setTimeout(() => setCopiedState('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy joint angles', error);
      setCopiedState('error');
      setTimeout(() => setCopiedState('idle'), 2000);
    }
  };

  const getCopyButtonText = () => {
    if (copiedState === 'copied') return 'Copied!';
    if (copiedState === 'error') return 'Copy failed';
    return 'Copy as JSON';
  };

  return (
    <div className="flex flex-col gap-3">
      {joints.map((joint) => (
        <div key={joint.name} className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            {joint.name}: {jointValues[joint.name]?.toFixed(2) ?? '0.00'}
          </label>
          <input
            type="range"
            min={joint.lower}
            max={joint.upper}
            step={0.01}
            value={jointValues[joint.name] ?? 0}
            onChange={(e) => handleSliderChange(joint.name, parseFloat(e.target.value))}
            className="range range-sm w-full"
          />
        </div>
      ))}

      {joints.length > 0 && (
        <div className="pt-2 flex justify-start">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-1 text-xs sm:text-sm rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={handleCopyJSON}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <rect
                x="7"
                y="7"
                width="12"
                height="12"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="3"
                y="3"
                width="12"
                height="12"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <span>{getCopyButtonText()}</span>
          </button>
        </div>
      )}
    </div>
  );
};
