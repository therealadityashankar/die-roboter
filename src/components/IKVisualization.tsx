import React, { useEffect, useRef, useState } from 'react';

interface IKVisualizationProps {
  positionY: number; // -1 to 1
  circleSize: number;
  zRangeMin: number;
  zRangeMax: number;
  calculateIK: (x: number, y: number, L1: number, L2: number) => { theta1: number; theta2: number } | null;
  width?: number;
  height?: number;
}

export const IKVisualization: React.FC<IKVisualizationProps> = ({
  positionY,
  circleSize,
  zRangeMin,
  zRangeMax,
  calculateIK,
  width = 80,
  height = 80,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ikAngles, setIkAngles] = useState<{ theta1: number; theta2: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate target coordinates
    const targetY = (positionY + 1); // 0 to 2
    const normalizedReach = (circleSize - zRangeMin) / (zRangeMax - zRangeMin);
    const targetZ = normalizedReach * 2; // 0 to 2


    // Link lengths
    const L1 = 1;
    const L2 = 1;

    // Calculate IK
    const ikResult = calculateIK(targetZ, targetY, L1, L2);
    const reachable = ikResult !== null;
    
    // Update state with IK angles
    setIkAngles(ikResult);
    
    // Scaling and offset for visualization
    const scale = 25; // pixels per unit
    const originX = 15;
    const originY = height - 15;

    // Draw coordinate system
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + 50, originY); // X axis
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX, originY - 50); // Z axis
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '8px sans-serif';
    ctx.fillText('Z', originX + 52, originY + 3);
    ctx.fillText('Y', originX - 3, originY - 52);

    if (reachable && ikResult) {
      // Calculate joint positions
      const joint1X = originX + L1 * Math.cos(ikResult.theta1) * scale;
      const joint1Y = originY - L1 * Math.sin(ikResult.theta1) * scale;
      const endX = joint1X + L2 * Math.cos(ikResult.theta1 + ikResult.theta2) * scale;
      const endY = joint1Y - L2 * Math.sin(ikResult.theta1 + ikResult.theta2) * scale;

      // Draw links
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(joint1X, joint1Y);
      ctx.stroke();

      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(joint1X, joint1Y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Draw joints
      ctx.fillStyle = '#1e40af';
      ctx.beginPath();
      ctx.arc(originX, originY, 3, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(joint1X, joint1Y, 3, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(endX, endY, 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw target point
    const targetDrawX = originX + targetZ * scale;
    const targetDrawY = originY - targetY * scale;
    ctx.fillStyle = reachable ? '#ef4444' : '#9ca3af';
    ctx.beginPath();
    ctx.arc(targetDrawX, targetDrawY, 2.5, 0, 2 * Math.PI);
    ctx.fill();

    // Draw target crosshair
    ctx.strokeStyle = reachable ? '#ef4444' : '#9ca3af';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(targetDrawX - 4, targetDrawY);
    ctx.lineTo(targetDrawX + 4, targetDrawY);
    ctx.moveTo(targetDrawX, targetDrawY - 4);
    ctx.lineTo(targetDrawX, targetDrawY + 4);
    ctx.stroke();

  }, [positionY, circleSize, zRangeMin, zRangeMax, calculateIK, width, height]);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] font-medium text-gray-600 text-center">
        IK (Y-Z)
      </span>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded bg-white"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
      {ikAngles ? (
        <div className="flex flex-col gap-0.5 text-[8px] text-gray-600">
          <div className="flex justify-between">
            <span>θ1:</span>
            <span className="font-mono">{ikAngles.theta1.toFixed(3)} rad</span>
          </div>
          <div className="flex justify-between">
            <span>θ2:</span>
            <span className="font-mono">{ikAngles.theta2.toFixed(3)} rad</span>
          </div>
        </div>
      ) : (
        <div className="text-[8px] text-gray-400 text-center">
          Unreachable
        </div>
      )}
    </div>
  );
};
