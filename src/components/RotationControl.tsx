import React, { useState, useEffect, useRef } from 'react';

const ROTATION_DIAMETER_REM = 4;
const ROTATION_SPEED = Math.PI / 360;

interface RotationControlProps {
  onRotate?: (delta: number) => void;
  onRotationStateChange?: (direction: number) => void;
}

function isEditableTarget(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  const editable = (t as any).isContentEditable;
  return editable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export const RotationControl: React.FC<RotationControlProps> = ({
  onRotate,
  onRotationStateChange,
}) => {
  const [rotationDirection, setRotationDirection] = useState(0);
  const [leftIntensity, setLeftIntensity] = useState(0);
  const [rightIntensity, setRightIntensity] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const pressedRef = useRef<{ q: boolean; e: boolean }>({ q: false, e: false });

  useEffect(() => {
    setLeftIntensity(rotationDirection > 0 ? 1 : 0);
    setRightIntensity(rotationDirection < 0 ? 1 : 0);
  }, [rotationDirection]);

  useEffect(() => {
    const applyRotation = () => {
      const delta = rotationDirection * ROTATION_SPEED;
      if (Math.abs(delta) > 1e-5) onRotate?.(delta);
      animationFrameRef.current = requestAnimationFrame(applyRotation);
    };
    applyRotation();
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [rotationDirection, onRotate]);

  const setDirection = (dir: number) => {
    setRotationDirection(prev => {
      if (prev !== dir) onRotationStateChange?.(dir);
      return dir;
    });
  };

  const recomputeDirectionFromKeys = () => {
    const { q, e } = pressedRef.current;
    const dir = q && !e ? 1 : e && !q ? -1 : 0;
    setDirection(dir);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e)) return;
      if (e.key === 'q' || e.key === 'Q') {
        if (!pressedRef.current.q) {
          pressedRef.current.q = true;
          recomputeDirectionFromKeys();
        }
        e.preventDefault();
      } else if (e.key === 'e' || e.key === 'E') {
        if (!pressedRef.current.e) {
          pressedRef.current.e = true;
          recomputeDirectionFromKeys();
        }
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isEditableTarget(e)) return;
      if (e.key === 'q' || e.key === 'Q') {
        if (pressedRef.current.q) {
          pressedRef.current.q = false;
          recomputeDirectionFromKeys();
        }
        e.preventDefault();
      } else if (e.key === 'e' || e.key === 'E') {
        if (pressedRef.current.e) {
          pressedRef.current.e = false;
          recomputeDirectionFromKeys();
        }
        e.preventDefault();
      }
    };
    const resetKeys = () => {
      pressedRef.current.q = false;
      pressedRef.current.e = false;
      setDirection(0);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', resetKeys);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') resetKeys();
    });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', resetKeys);
      document.removeEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') resetKeys();
      });
    };
  }, []);

  const startRotation = (direction: number) => setDirection(direction);
  const stopRotation = () => setDirection(0);

  const getButtonStyle = (intensity: number) => {
    const shade = 255 - Math.round(intensity * 120);
    return { backgroundColor: `rgba(${shade}, ${shade}, ${shade}, 0.9)` };
  };

  const handlePointerDown =
    (direction: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      startRotation(direction);
    };

  const handlePointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopRotation();
  };

  const handleKeyDown =
    (direction: number) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        startRotation(direction);
      }
    };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      stopRotation();
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative rounded-full border border-black overflow-hidden flex"
        style={{ width: `${ROTATION_DIAMETER_REM}rem`, height: `${ROTATION_DIAMETER_REM}rem` }}
      >
        <button
          type="button"
          className="flex-1 h-full bg-white/70 focus:outline-none flex items-center justify-center border-r border-black select-none transition-colors"
          aria-label="Rotate robot left"
          style={getButtonStyle(leftIntensity)}
          onPointerDown={handlePointerDown(1)}
          onPointerUp={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onKeyDown={handleKeyDown(1)}
          onKeyUp={handleKeyUp}
          tabIndex={0}
          title="Q"
        >
          &#8630;
        </button>
        <button
          type="button"
          className="flex-1 h-full bg-white/70 focus:outline-none flex items-center justify-center select-none transition-colors"
          aria-label="Rotate robot right"
          style={getButtonStyle(rightIntensity)}
          onPointerDown={handlePointerDown(-1)}
          onPointerUp={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onKeyDown={handleKeyDown(-1)}
          onKeyUp={handleKeyUp}
          tabIndex={0}
          title="E"
        >
          &#8631;
        </button>
      </div>

      {/* Label moved to bottom */}
      <span className="text-xs font-medium text-gray-700 text-center mt-1">
        Rotate
        <br />
        Q and E
      </span>
    </div>
  );
};
