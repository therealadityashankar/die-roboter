import { Robot } from '../robots/Robot';
import { showGamepad } from './gamepad';

export interface DefaultPivotValues {
  [key: string]: number;
}

export function createJointSliders(robot: Robot, containerId: string = 'joint-sliders', defaultValues?: DefaultPivotValues) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Default pivot values if none provided
  const defaultPivotValues = defaultValues || {
    "shoulder_pan": 0.00,
    "shoulder_lift": 35.00,
    "elbow_flex": -25.00,
    "wrist_flex": 86.00,
    "wrist_roll": 59.00,
    "gripper": 67.00
  };

  // Clear existing content
  container.innerHTML = '';

  console.log("joint sliders pivotMap: ", robot.pivotMap);

  // Position controls (XZ nudge)
  const posControls = document.createElement('div');
  posControls.style.display = 'flex';
  posControls.style.flexWrap = 'wrap';
  posControls.style.gap = '8px';
  posControls.style.alignItems = 'center';
  posControls.style.marginBottom = '12px';

  const posLabel = document.createElement('span');
  posLabel.textContent = 'Position (XZ):';
  posLabel.style.fontWeight = 'bold';
  posControls.appendChild(posLabel);

  const stepInput = document.createElement('input');
  stepInput.type = 'number';
  stepInput.value = '0.1';
  stepInput.step = '0.01';
  stepInput.style.width = '72px';
  stepInput.title = 'Step size';
  posControls.appendChild(stepInput);

  const gamePad = document.createElement("div")
  showGamepad(gamePad)
  container.appendChild(gamePad)

  // Gamepad-driven movement (axes 2 -> X, axes 3 -> Z)
  const DEAD_ZONE = 0.15;
  const GAMEPAD_POLL_MS = 60; // keep in sync with showGamepad default

  function pollGamepadAndMove() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads.length ? pads[0] : null;
    if (gp && gp.axes) {
      const a2 = gp.axes[2] ?? 0; // Axis 2
      const a3 = gp.axes[3] ?? 0; // Axis 3
      const dx = Math.abs(a2) > DEAD_ZONE ? a2 * getStep() : 0;
      const dz = Math.abs(a3) > DEAD_ZONE ? a3 * getStep() : 0;
      if (dx !== 0 || dz !== 0) {
        moveBy(dx, dz);
      }
    }
    setTimeout(pollGamepadAndMove, GAMEPAD_POLL_MS);
  }
  pollGamepadAndMove();

  function getStep(): number {
    const v = parseFloat(stepInput.value);
    return isNaN(v) ? 0.1 : v;
  }

  function moveBy(dx: number, dz: number) {
    const anyRobot = robot as any;
    if (typeof anyRobot.moveByXZ === 'function') {
      anyRobot.moveByXZ(dx, dz);
      return;
    }
    // Fallback: move URDF root and mark physics for update
    if (robot.robot) {
      robot.robot.position.x += dx;
      robot.robot.position.z += dz;
      // Mark links as needing physics update and update gripped objects
      Robot.markLinksAsNeedingPhysicsUpdate(robot.robot);
      robot.updateGrippedObjectPositions();
    }
  }

  const buttons: Array<{ id: string; label: string; onClick: () => void }> = [
    { id: 'x-minus', label: 'X-', onClick: () => moveBy(-getStep(), 0) },
    { id: 'x-plus', label: 'X+', onClick: () => moveBy(getStep(), 0) },
    { id: 'z-minus', label: 'Z-', onClick: () => moveBy(0, -getStep()) },
    { id: 'z-plus', label: 'Z+', onClick: () => moveBy(0, getStep()) },
  ];

  buttons.forEach(({ id, label, onClick }) => {
    const btn = document.createElement('button');
    btn.id = `${containerId}-${id}`;
    btn.textContent = label;
    btn.style.padding = '4px 8px';
    btn.addEventListener('click', onClick);
    posControls.appendChild(btn);
  });

  container.appendChild(posControls);

  // Create sliders for each pivot
  Object.entries(robot.pivotMap).forEach(([key, pivot]) => {
    if (!pivot.physicsRepresentation) return;
    
    const label = document.createElement('label');
    // Initial label text
    label.innerText = `${key}: ${pivot.value.toFixed(2)}`;
    container.appendChild(label);
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = pivot.lower.toString();
    slider.max = pivot.upper.toString();
    slider.value = defaultPivotValues[key]?.toString() || '0';
    slider.step = '0.01';
    slider.style.width = '100%';
    slider.style.marginBottom = '10px';

    function updateValues() {
      const value = parseFloat(slider.value);
      // Update the label text with the new slider value
      label.innerText = `${key}: ${value.toFixed(2)}`;
      robot.setPivotValue(pivot.name, value);
    }

    slider.addEventListener('input', updateValues);
    
    // Set initial value
    updateValues();
    
    container.appendChild(slider);
    container.appendChild(document.createElement('br'));
  });
}

export default createJointSliders;
