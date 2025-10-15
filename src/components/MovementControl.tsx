import React, { useRef, useState, useEffect, useMemo } from 'react';

const JOYSTICK_DIAMETER_REM = 4;
const KNOB_DIAMETER_REM = 2.5;

type Vec2 = { x: number; z: number };

interface MovementControlProps {
  position?: { x: number; z: number };
  onMove?: (dx: number, dz: number) => void;
  onPositionChange?: (position: { x: number; z: number }) => void;
}

function clampVector(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.z);
  if (len <= 1 || len === 0) return v;
  return { x: v.x / len, z: v.z / len };
}

function isEditableTarget(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  const editable = (t as any).isContentEditable;
  return editable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export const MovementControl: React.FC<MovementControlProps> = ({
  position = { x: 0, z: 0 },
  onMove,
  onPositionChange,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  const [stickVector, setStickVector] = useState<Vec2>({ x: 0, z: 0 });
  const [keysVector, setKeysVector] = useState<Vec2>({ x: 0, z: 0 });
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPointerId, setJoystickPointerId] = useState<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const controlVector = useMemo(() => {
    return clampVector({ x: stickVector.x + keysVector.x, z: stickVector.z + keysVector.z });
  }, [stickVector, keysVector]);

  // Update knob visual position from the combined vector
  useEffect(() => {
    if (!joystickRef.current || !knobRef.current) return;

    const radius = joystickRef.current.clientWidth / 2;
    const knobRadius = knobRef.current.clientWidth / 2;
    const available = Math.max(radius - knobRadius, 0);
    const offsetX = controlVector.x * available;
    const offsetY = -controlVector.z * available;

    knobRef.current.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  }, [controlVector]);

  // Notify onPositionChange for both pointer and keys
  useEffect(() => {
    onPositionChange?.(controlVector);
  }, [controlVector, onPositionChange]);

  // Pointer input
  const updateJoystickFromEvent = (event: React.PointerEvent) => {
    if (!joystickRef.current) return;

    const rect = joystickRef.current.getBoundingClientRect();
    let offsetX = event.clientX - rect.left - rect.width / 2;
    let offsetY = event.clientY - rect.top - rect.height / 2;

    const radius = rect.width / 2;
    const distance = Math.hypot(offsetX, offsetY);
    if (distance > radius) {
      const scale = radius / distance;
      offsetX *= scale;
      offsetY *= scale;
    }

    const newVector = clampVector({
      x: offsetX / radius,
      z: -offsetY / radius,
    });

    setStickVector(newVector);
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    setJoystickActive(true);
    setJoystickPointerId(event.pointerId);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (knobRef.current) {
      knobRef.current.style.transition = 'none';
    }
    updateJoystickFromEvent(event);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!joystickActive || joystickPointerId !== event.pointerId) return;
    updateJoystickFromEvent(event);
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (joystickPointerId !== event.pointerId) return;
    setJoystickActive(false);
    setJoystickPointerId(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (knobRef.current) {
      knobRef.current.style.transition = '';
    }
    setStickVector({ x: 0, z: 0 });
  };

  // Keyboard input, applied globally
  const applyKeyDelta = (key: string, pressed: boolean) => {
    const up = key === 'ArrowUp' || key === 'w' || key === 'W';
    const down = key === 'ArrowDown' || key === 's' || key === 'S';
    const left = key === 'ArrowLeft' || key === 'a' || key === 'A';
    const right = key === 'ArrowRight' || key === 'd' || key === 'D';
    if (!(up || down || left || right)) return false;

    setKeysVector(prev => {
      const dx = (right ? 1 : 0) - (left ? 1 : 0);
      const dz = (up ? 1 : 0) - (down ? 1 : 0);

      let next = { ...prev };
      if (pressed) {
        if (left || right) next.x = dx;
        if (up || down) next.z = dz;
      } else {
        if (left || right) next.x = (prev.x === dx ? 0 : prev.x);
        if (up || down) next.z = (prev.z === dz ? 0 : prev.z);
      }
      return next;
    });

    return true;
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e)) return;
      const handled = applyKeyDelta(e.key, true);
      if (handled) {
        // Prevent page scroll and native browser navigation with arrows and space
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (isEditableTarget(e)) return;
      const handled = applyKeyDelta(e.key, false);
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const resetKeys = () => setKeysVector({ x: 0, z: 0 });

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

  // Movement loop
  useEffect(() => {
    const POSITION_STEP = 0.06;

    const applyMotion = () => {
      const dx = controlVector.x * POSITION_STEP;
      const dz = controlVector.z * POSITION_STEP;
      if (Math.abs(dx) > 1e-3 || Math.abs(dz) > 1e-3) {
        onMove?.(dx, dz);
      }
      animationFrameRef.current = requestAnimationFrame(applyMotion);
    };

    applyMotion();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [controlVector, onMove]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={joystickRef}
        className="relative rounded-full border border-black bg-gray-100 shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-blue-400"
        style={{
          width: `${JOYSTICK_DIAMETER_REM}rem`,
          height: `${JOYSTICK_DIAMETER_REM}rem`,
        }}
        role="application"
        aria-label="Movement control, drag or use Arrow or WASD keys"
        title="Drag or use Arrow or WASD keys"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Arrows */}
        <span className="absolute top-0 left-1/2 -translate-x-1/2 text-gray-600 text-sm select-none">↑</span>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-gray-600 text-sm select-none">↓</span>
        <span className="absolute top-1/2 left-0 -translate-y-1/2 translate-x-[3px] text-gray-600 text-sm select-none">←</span>
        <span className="absolute top-1/2 right-0 -translate-y-1/2 -translate-x-[3.5px] text-gray-600 text-sm select-none">→</span>

        {/* Knob */}
        <div
          ref={knobRef}
          className="absolute top-1/2 left-1/2 rounded-full bg-white border border-black shadow transition-transform duration-75 ease-out cursor-pointer"
          style={{
            width: `${KNOB_DIAMETER_REM}rem`,
            height: `${KNOB_DIAMETER_REM}rem`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* Labels */}
      <span className="text-xs font-medium text-gray-700 text-center">
        Drag to move
        <br />
        or WASD keys
      </span>
    </div>
  );
};
