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

  // Locate external tab container if present
  const externalTabContainer = document.getElementById(`${containerId}-tabs`) || document.getElementById('joint-tab-container');
  if (externalTabContainer) {
    externalTabContainer.innerHTML = '';
  }

  const tabList = document.createElement('div');
  tabList.className = 'flex gap-2';

  const tabBaseClasses = 'px-3 py-1 text-xs sm:text-sm rounded border bg-gray-50 text-gray-800 transition-colors cursor-pointer';

  const positionTab = document.createElement('button');
  positionTab.type = 'button';
  positionTab.textContent = 'Position';
  positionTab.className = `${tabBaseClasses} border-black`;

  const jointTab = document.createElement('button');
  jointTab.type = 'button';
  jointTab.textContent = 'Joint Angles';
  jointTab.className = `${tabBaseClasses} border-gray-300`;

  tabList.appendChild(positionTab);
  tabList.appendChild(jointTab);

  if (externalTabContainer) {
    externalTabContainer.appendChild(tabList);
  } else {
    const fallbackTabsWrapper = document.createElement('div');
    fallbackTabsWrapper.className = 'flex justify-end mb-2';
    fallbackTabsWrapper.appendChild(tabList);
    container.appendChild(fallbackTabsWrapper);
  }

  const panelsWrapper = document.createElement('div');
  panelsWrapper.className = 'mt-2 flex flex-col gap-3';

  const positionPanel = document.createElement('div');
  positionPanel.className = 'flex flex-col gap-3';

  const jointPanel = document.createElement('div');
  jointPanel.className = 'flex flex-col gap-3 hidden';

  panelsWrapper.appendChild(positionPanel);
  panelsWrapper.appendChild(jointPanel);
  container.appendChild(panelsWrapper);

  function setActiveTab(target: 'position' | 'joint') {
    if (target === 'position') {
      positionTab.classList.remove('border-gray-300');
      positionTab.classList.add('border-black');
      jointTab.classList.remove('border-black');
      jointTab.classList.add('border-gray-300');
      positionPanel.classList.remove('hidden');
      jointPanel.classList.add('hidden');
    } else {
      jointTab.classList.remove('border-gray-300');
      jointTab.classList.add('border-black');
      positionTab.classList.remove('border-black');
      positionTab.classList.add('border-gray-300');
      jointPanel.classList.remove('hidden');
      positionPanel.classList.add('hidden');
    }
  }

  positionTab.addEventListener('click', () => setActiveTab('position'));
  jointTab.addEventListener('click', () => setActiveTab('joint'));

  // Position controls (XZ nudge)
  const posControls = document.createElement('div');
  posControls.className = 'flex flex-col gap-3 mb-3';

  const controlRow = document.createElement('div');
  controlRow.className = 'w-full flex items-start justify-between gap-6';

  const joystickWrapper = document.createElement('div');
  joystickWrapper.className = 'flex flex-col items-center gap-1';

  const joystickLabel = document.createElement('span');
  joystickLabel.textContent = 'Drag to move';
  joystickLabel.className = 'text-xs font-medium text-gray-700';

  const joystickBase = document.createElement('div');
  joystickBase.className = 'relative w-20 h-20 rounded-full border border-black bg-gray-100 shadow-sm cursor-pointer';

  const joystickKnob = document.createElement('div');
  joystickKnob.className = 'absolute top-1/2 left-1/2 w-14 h-14 rounded-full bg-white border border-black shadow transition-transform duration-75 ease-out cursor-pointer';
  joystickKnob.style.transform = 'translate(-50%, -50%)';

  joystickBase.appendChild(joystickKnob);
  joystickWrapper.appendChild(joystickBase);
  joystickWrapper.appendChild(joystickLabel);

  controlRow.appendChild(joystickWrapper);

  const rotationWrapper = document.createElement('div');
  rotationWrapper.className = 'flex flex-col items-center gap-1';

  const rotationLabel = document.createElement('span');
  rotationLabel.textContent = 'Rotate';
  rotationLabel.className = 'text-xs font-medium text-gray-700';

  const rotationControl = document.createElement('div');
  rotationControl.className = 'relative w-20 h-20 rounded-full border border-black overflow-hidden flex';

  const rotateLeft = document.createElement('button');
  rotateLeft.type = 'button';
  rotateLeft.className = 'flex-1 h-full bg-white/70 hover:bg-gray-200 focus:outline-none flex items-center justify-center border-r border-black select-none';
  rotateLeft.setAttribute('aria-label', 'Rotate robot left');
  rotateLeft.innerHTML = '&#8630;';

  const rotateRight = document.createElement('button');
  rotateRight.type = 'button';
  rotateRight.className = 'flex-1 h-full bg-white/70 hover:bg-gray-200 focus:outline-none flex items-center justify-center select-none';
  rotateRight.setAttribute('aria-label', 'Rotate robot right');
  rotateRight.innerHTML = '&#8631;';

  const ROTATION_SPEED = Math.PI / 360; // radians per frame based on manual control

  function rotateBy(delta: number) {
    const anyRobot = robot as any;
    if (typeof anyRobot.rotateByYaw === 'function') {
      anyRobot.rotateByYaw(delta);
      return;
    }

    if (robot.robot) {
      robot.robot.rotation.z += delta;
      Robot.markLinksAsNeedingPhysicsUpdate(robot.robot);
      robot.updateGrippedObjectPositions();
    }
  }

  const rotationState = {
    manualDirection: 0,
    gamepadInfluence: 0,
  };

  function startManualRotation(direction: number) {
    rotationState.manualDirection = direction;
  }

  function stopManualRotation() {
    rotationState.manualDirection = 0;
  }

  const manualHandlers = (target: HTMLElement, direction: number) => {
    target.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      target.setPointerCapture(event.pointerId);
      startManualRotation(direction);
    });

    const stop = (event: PointerEvent) => {
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
      stopManualRotation();
    };

    target.addEventListener('pointerup', stop);
    target.addEventListener('pointerleave', stop);
    target.addEventListener('pointercancel', stop);
    target.addEventListener('pointerout', (event) => {
      if (!target.contains(event.relatedTarget as Node)) {
        stop(event as PointerEvent);
      }
    });

    target.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        startManualRotation(direction);
      }
    });

    target.addEventListener('keyup', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        stopManualRotation();
      }
    });
  };

  rotateLeft.tabIndex = 0;
  rotateRight.tabIndex = 0;
  manualHandlers(rotateLeft, 1);
  manualHandlers(rotateRight, -1);

  rotationControl.appendChild(rotateLeft);
  rotationControl.appendChild(rotateRight);
  rotationWrapper.appendChild(rotationControl);
  rotationWrapper.appendChild(rotationLabel);
  controlRow.appendChild(rotationWrapper);

  posControls.appendChild(controlRow);

  let joystickActive = false;
  let joystickPointerId: number | null = null;
  const joystickVector = { x: 0, z: 0 };

  function resetJoystick() {
    joystickVector.x = 0;
    joystickVector.z = 0;
    joystickKnob.style.transform = 'translate(-50%, -50%)';
  }

  function updateJoystickFromEvent(e: PointerEvent) {
    const rect = joystickBase.getBoundingClientRect();
    let offsetX = e.clientX - rect.left - rect.width / 2;
    let offsetY = e.clientY - rect.top - rect.height / 2;

    const radius = rect.width / 2;
    const distance = Math.hypot(offsetX, offsetY);
    if (distance > radius) {
      const scale = radius / distance;
      offsetX *= scale;
      offsetY *= scale;
    }

    joystickKnob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
    joystickVector.x = offsetX / radius;
    joystickVector.z = -offsetY / radius; // invert Y so upward drag moves forward
  }

  function handlePointerDown(e: PointerEvent) {
    joystickActive = true;
    joystickPointerId = e.pointerId;
    joystickBase.setPointerCapture(e.pointerId);
    joystickKnob.style.transition = 'none';
    updateJoystickFromEvent(e);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!joystickActive || joystickPointerId !== e.pointerId) return;
    updateJoystickFromEvent(e);
  }

  function handlePointerUp(e: PointerEvent) {
    if (joystickPointerId !== e.pointerId) return;
    joystickActive = false;
    joystickPointerId = null;
    joystickBase.releasePointerCapture(e.pointerId);
    joystickKnob.style.transition = '';
    resetJoystick();
  }

  joystickBase.addEventListener('pointerdown', handlePointerDown);
  joystickBase.addEventListener('pointermove', handlePointerMove);
  joystickBase.addEventListener('pointerup', handlePointerUp);
  joystickBase.addEventListener('pointercancel', handlePointerUp);
  joystickBase.addEventListener('pointerleave', (e) => {
    if (!joystickActive) return;
    handlePointerUp(e as PointerEvent);
  });

  // Gamepad-driven movement (axes 2 -> X, axes 3 -> Z)
  const DEAD_ZONE = 0.15;
  const GAMEPAD_POLL_MS = 60; // keep in sync with showGamepad default
  const POSITION_STEP = 0.06;

  function pollGamepadAndMove() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads.length ? pads[0] : null;
    if (gp && gp.axes) {
      const a2 = gp.axes[2] ?? 0; // Axis 2
      const a3 = gp.axes[3] ?? 0; // Axis 3
      const dx = Math.abs(a2) > DEAD_ZONE ? a2 * POSITION_STEP : 0;
      const dz = Math.abs(a3) > DEAD_ZONE ? a3 * POSITION_STEP : 0;
      if (dx !== 0 || dz !== 0) {
        moveBy(dx, dz);
      }

      const triggerAxisLeft = gp.axes[4] ?? 0;
      const triggerAxisRight = gp.axes[5] ?? 0;
      const triggerButtonLeft = gp.buttons?.[6]?.value ?? 0;
      const triggerButtonRight = gp.buttons?.[7]?.value ?? 0;

      const leftValue = Math.max(triggerAxisLeft, triggerButtonLeft);
      const rightValue = Math.max(triggerAxisRight, triggerButtonRight);

      const ROTATION_TRIGGER_SCALE = Math.PI / 180; // radians per poll
      rotationState.gamepadInfluence = (rightValue - leftValue) * ROTATION_TRIGGER_SCALE;
    } else {
      rotationState.gamepadInfluence = 0;
    }
    setTimeout(pollGamepadAndMove, GAMEPAD_POLL_MS);
  }
  pollGamepadAndMove();

  function applyJoystickMotion() {
    const dx = joystickVector.x * POSITION_STEP;
    const dz = joystickVector.z * POSITION_STEP;
    if (Math.abs(dx) > 1e-3 || Math.abs(dz) > 1e-3) {
      moveBy(dx, dz);
    }
    requestAnimationFrame(applyJoystickMotion);
  }
  requestAnimationFrame(applyJoystickMotion);

  function applyRotationMotion() {
    const manualContribution = rotationState.manualDirection * ROTATION_SPEED;
    const gamepadContribution = rotationState.gamepadInfluence;
    const delta = manualContribution + gamepadContribution;
    if (Math.abs(delta) > 1e-5) {
      rotateBy(delta);
    }
    requestAnimationFrame(applyRotationMotion);
  }
  requestAnimationFrame(applyRotationMotion);

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

  positionPanel.appendChild(posControls);

  const gamePadDivider = document.createElement('div');
  gamePadDivider.className = 'border-t border-gray-200 my-3';
  positionPanel.appendChild(gamePadDivider);

  const gamePadRow = document.createElement('div');
  gamePadRow.className = 'mt-2 flex items-center justify-between gap-4';

  const gamePadText = document.createElement('p');
  gamePadText.className = 'text-xs text-gray-600 flex-1';
  gamePadText.textContent = 'Connect a game controller to have a more fun experience controlling the robot.';

  const gamePad = document.createElement('div');
  gamePad.className = 'max-w-[140px]';
  showGamepad(gamePad);

  gamePadRow.appendChild(gamePadText);
  gamePadRow.appendChild(gamePad);
  positionPanel.appendChild(gamePadRow);

  // Create sliders for each pivot
  Object.entries(robot.pivotMap).forEach(([key, pivot]) => {
    if (!pivot.physicsRepresentation) return;
    
    const sliderWrapper = document.createElement('div');
    sliderWrapper.className = 'flex flex-col gap-1';

    const label = document.createElement('label');
    label.className = 'text-xs font-semibold uppercase tracking-wide text-gray-600';
    // Initial label text
    label.innerText = `${key}: ${pivot.value.toFixed(2)}`;
    sliderWrapper.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = pivot.lower.toString();
    slider.max = pivot.upper.toString();
    slider.value = defaultPivotValues[key]?.toString() || '0';
    slider.step = '0.01';
    slider.className = 'range range-sm w-full';

    function updateValues() {
      const value = parseFloat(slider.value);
      // Update the label text with the new slider value
      label.innerText = `${key}: ${value.toFixed(2)}`;
      robot.setPivotValue(pivot.name, value);
    }

    slider.addEventListener('input', updateValues);
    
    // Set initial value
    updateValues();
    
    sliderWrapper.appendChild(slider);
    jointPanel.appendChild(sliderWrapper);
  });
}

export default createJointSliders;
