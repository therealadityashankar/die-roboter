import { Robot } from '../../robots/Robot';

const POSITION_STEP = 0.06;
const DEAD_ZONE = 0.15;
const GAMEPAD_POLL_MS = 60;
const ROTATION_SPEED = Math.PI / 360;
const ROTATION_TRIGGER_SCALE = Math.PI / 180;
const MAX_GAMEPAD_ROTATION = ROTATION_TRIGGER_SCALE;
const JOYSTICK_DIAMETER_REM = 4;
const KNOB_DIAMETER_REM = 2.5;
const ROTATION_DIAMETER_REM = 4;

interface RotationState {
  manualDirection: number;
  gamepadInfluence: number;
}

interface PoseState {
  x: number;
  z: number;
  rotationRadians: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function createMovementControls(robot: Robot): HTMLDivElement {
  const posControls = document.createElement('div');
  posControls.className = 'flex flex-col gap-3 mb-3 items-start';

  const controlRow = document.createElement('div');
  controlRow.className = 'flex items-start gap-4';

  const joystickWrapper = document.createElement('div');
  joystickWrapper.className = 'flex items-center gap-2';

  const joystickBase = document.createElement('div');
  joystickBase.className = 'relative rounded-full border border-black bg-gray-100 shadow-sm cursor-pointer';
  joystickBase.style.width = `${JOYSTICK_DIAMETER_REM}rem`;
  joystickBase.style.height = `${JOYSTICK_DIAMETER_REM}rem`;

  const joystickKnob = document.createElement('div');
  joystickKnob.className = 'absolute top-1/2 left-1/2 rounded-full bg-white border border-black shadow transition-transform duration-75 ease-out cursor-pointer';
  joystickKnob.style.width = `${KNOB_DIAMETER_REM}rem`;
  joystickKnob.style.height = `${KNOB_DIAMETER_REM}rem`;
  joystickKnob.style.transform = 'translate(-50%, -50%)';

  const joystickLabel = document.createElement('span');
  joystickLabel.textContent = 'Drag to move';
  joystickLabel.className = 'text-xs font-medium text-gray-700 whitespace-nowrap';

  joystickBase.appendChild(joystickKnob);
  joystickWrapper.appendChild(joystickBase);
  joystickWrapper.appendChild(joystickLabel);

  controlRow.appendChild(joystickWrapper);

  const rotationWrapper = document.createElement('div');
  rotationWrapper.className = 'flex items-center gap-2';

  const rotationControl = document.createElement('div');
  rotationControl.className = 'relative rounded-full border border-black overflow-hidden flex';
  rotationControl.style.width = `${ROTATION_DIAMETER_REM}rem`;
  rotationControl.style.height = `${ROTATION_DIAMETER_REM}rem`;

  const rotateLeft = document.createElement('button');
  rotateLeft.type = 'button';
  rotateLeft.className = 'flex-1 h-full bg-white/70 focus:outline-none flex items-center justify-center border-r border-black select-none transition-colors';
  rotateLeft.setAttribute('aria-label', 'Rotate robot left');
  rotateLeft.innerHTML = '&#8630;';

  const rotateRight = document.createElement('button');
  rotateRight.type = 'button';
  rotateRight.className = 'flex-1 h-full bg-white/70 focus:outline-none flex items-center justify-center select-none transition-colors';
  rotateRight.setAttribute('aria-label', 'Rotate robot right');
  rotateRight.innerHTML = '&#8631;';

  rotationControl.appendChild(rotateLeft);
  rotationControl.appendChild(rotateRight);

  const rotationLabel = document.createElement('span');
  rotationLabel.textContent = 'Rotate';
  rotationLabel.className = 'text-xs font-medium text-gray-700 whitespace-nowrap';

  rotationWrapper.appendChild(rotationControl);
  rotationWrapper.appendChild(rotationLabel);

  controlRow.appendChild(rotationWrapper);
  posControls.appendChild(controlRow);

  const rotationState: RotationState = {
    manualDirection: 0,
    gamepadInfluence: 0,
  };

  const manualVector = { x: 0, z: 0 };
  const gamepadVector = { x: 0, z: 0 };
  let joystickActive = false;
  let joystickPointerId: number | null = null;

  const positionReadout = document.createElement('div');
  positionReadout.className = 'text-xs text-gray-600';
  const rotationReadout = document.createElement('div');
  rotationReadout.className = 'text-xs text-gray-600';

  const readoutWrapper = document.createElement('div');
  readoutWrapper.className = 'flex flex-col gap-1 text-left';
  readoutWrapper.appendChild(positionReadout);
  readoutWrapper.appendChild(rotationReadout);
  posControls.appendChild(readoutWrapper);

  const currentPose: PoseState = {
    x: robot.robot?.position.x ?? 0,
    z: robot.robot?.position.z ?? 0,
    rotationRadians: robot.robot?.rotation.z ?? 0,
  };

  function syncPoseFromRobot() {
    if (robot.robot) {
      currentPose.x = robot.robot.position.x;
      currentPose.z = robot.robot.position.z;
      currentPose.rotationRadians = robot.robot.rotation.z;
    }
  }

  function updatePoseReadout() {
    syncPoseFromRobot();
    positionReadout.textContent = `Position (X,Z): ${currentPose.x.toFixed(2)}, ${currentPose.z.toFixed(2)}`;
    const rotationDegrees = currentPose.rotationRadians * (180 / Math.PI);
    rotationReadout.textContent = `Rotation: ${rotationDegrees.toFixed(1)}°`;
  }

  function getCombinedVector() {
    const combined = {
      x: manualVector.x + gamepadVector.x,
      z: manualVector.z + gamepadVector.z,
    };
    const magnitude = Math.hypot(combined.x, combined.z);
    if (magnitude > 1) {
      combined.x /= magnitude;
      combined.z /= magnitude;
    }
    return combined;
  }

  function updateJoystickVisual() {
    const combined = getCombinedVector();
    const radius = joystickBase.clientWidth / 2;
    const knobRadius = joystickKnob.clientWidth / 2;
    const available = Math.max(radius - knobRadius, 0);
    const offsetX = combined.x * available;
    const offsetY = -combined.z * available;
    joystickKnob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  }

  function resetManualVector() {
    manualVector.x = 0;
    manualVector.z = 0;
    updateJoystickVisual();
  }

  function updateJoystickFromEvent(event: PointerEvent) {
    const rect = joystickBase.getBoundingClientRect();
    let offsetX = event.clientX - rect.left - rect.width / 2;
    let offsetY = event.clientY - rect.top - rect.height / 2;

    const radius = rect.width / 2;
    const distance = Math.hypot(offsetX, offsetY);
    if (distance > radius) {
      const scale = radius / distance;
      offsetX *= scale;
      offsetY *= scale;
    }

    manualVector.x = offsetX / radius;
    manualVector.z = -offsetY / radius;
    updateJoystickVisual();
  }

  function handlePointerDown(event: PointerEvent) {
    joystickActive = true;
    joystickPointerId = event.pointerId;
    joystickBase.setPointerCapture(event.pointerId);
    joystickKnob.style.transition = 'none';
    updateJoystickFromEvent(event);
  }

  function handlePointerMove(event: PointerEvent) {
    if (!joystickActive || joystickPointerId !== event.pointerId) return;
    updateJoystickFromEvent(event);
  }

  function handlePointerUp(event: PointerEvent) {
    if (joystickPointerId !== event.pointerId) return;
    joystickActive = false;
    joystickPointerId = null;
    joystickBase.releasePointerCapture(event.pointerId);
    joystickKnob.style.transition = '';
    resetManualVector();
  }

  joystickBase.addEventListener('pointerdown', handlePointerDown);
  joystickBase.addEventListener('pointermove', handlePointerMove);
  joystickBase.addEventListener('pointerup', handlePointerUp);
  joystickBase.addEventListener('pointercancel', handlePointerUp);
  joystickBase.addEventListener('pointerleave', (event) => {
    if (!joystickActive) return;
    handlePointerUp(event as PointerEvent);
  });

  function rotateBy(delta: number) {
    const anyRobot = robot as any;
    if (typeof anyRobot.rotateByYaw === 'function') {
      anyRobot.rotateByYaw(delta);
      updatePoseReadout();
      return;
    }

    if (robot.robot) {
      robot.robot.rotation.z += delta;
      Robot.markLinksAsNeedingPhysicsUpdate(robot.robot);
      robot.updateGrippedObjectPositions();
      updatePoseReadout();
    }
  }

  function startManualRotation(direction: number) {
    rotationState.manualDirection = direction;
    updateRotationVisual();
  }

  function stopManualRotation() {
    rotationState.manualDirection = 0;
    updateRotationVisual();
  }

  function bindManualControl(target: HTMLElement, direction: number) {
    target.tabIndex = 0;

    target.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      target.setPointerCapture(event.pointerId);
      startManualRotation(direction);
      updateRotationVisual();
    });

    const stopHandler = (event: PointerEvent) => {
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
      stopManualRotation();
    };

    target.addEventListener('pointerup', stopHandler);
    target.addEventListener('pointerleave', stopHandler);
    target.addEventListener('pointercancel', stopHandler);

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
  }

  bindManualControl(rotateLeft, 1);
  bindManualControl(rotateRight, -1);

  function updateRotationVisual() {
    const leftIntensity = Math.max(
      rotationState.manualDirection > 0 ? 1 : 0,
      clamp(-rotationState.gamepadInfluence / MAX_GAMEPAD_ROTATION, 0, 1)
    );
    const rightIntensity = Math.max(
      rotationState.manualDirection < 0 ? 1 : 0,
      clamp(-rotationState.gamepadInfluence / MAX_GAMEPAD_ROTATION, 0, 1)
    );

    const applyIntensity = (button: HTMLButtonElement, intensity: number) => {
      const shade = 255 - Math.round(intensity * 120);
      button.style.backgroundColor = `rgba(${shade}, ${shade}, ${shade}, 0.9)`;
    };

    applyIntensity(rotateLeft, leftIntensity);
    applyIntensity(rotateRight, rightIntensity);
  }

  function moveRobotBy(dx: number, dz: number) {
    currentPose.x += dx;
    currentPose.z += dz;
    const anyRobot = robot as any;
    if (typeof anyRobot.moveByXZ === 'function') {
      anyRobot.moveByXZ(dx, dz);
      updatePoseReadout();
      return;
    }

    if (robot.robot) {
      robot.robot.position.x += dx;
      robot.robot.position.z += dz;
      Robot.markLinksAsNeedingPhysicsUpdate(robot.robot);
      robot.updateGrippedObjectPositions();
      updatePoseReadout();
    }
  }

  function applyJoystickMotion() {
    const dx = manualVector.x * POSITION_STEP;
    const dz = manualVector.z * POSITION_STEP;
    if (Math.abs(dx) > 1e-3 || Math.abs(dz) > 1e-3) {
      moveRobotBy(dx, dz);
    }
    requestAnimationFrame(applyJoystickMotion);
  }
  requestAnimationFrame(applyJoystickMotion);

  function applyRotationMotion() {
    const manualContribution = rotationState.manualDirection * ROTATION_SPEED;
    const delta = manualContribution + rotationState.gamepadInfluence;
    if (Math.abs(delta) > 1e-5) {
      rotateBy(delta);
    }
    requestAnimationFrame(applyRotationMotion);
  }
  requestAnimationFrame(applyRotationMotion);

  function pollGamepadAndMove() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads.length ? pads[0] : null;
    if (gp && gp.axes) {
      const axisX = gp.axes[2] ?? 0;
      const axisZ = gp.axes[3] ?? 0;
      const dx = Math.abs(axisX) > DEAD_ZONE ? axisX * POSITION_STEP : 0;
      const dz = Math.abs(axisZ) > DEAD_ZONE ? axisZ * POSITION_STEP : 0;
      gamepadVector.x = Math.abs(axisX) > DEAD_ZONE ? axisX : 0;
      gamepadVector.z = Math.abs(axisZ) > DEAD_ZONE ? -axisZ : 0;
      updateJoystickVisual();
      if (dx !== 0 || dz !== 0) {
        moveRobotBy(dx, dz);
      }

      const triggerAxisLeft = gp.axes[4] ?? 0;
      const triggerAxisRight = gp.axes[5] ?? 0;
      const triggerButtonLeft = gp.buttons?.[6]?.value ?? 0;
      const triggerButtonRight = gp.buttons?.[7]?.value ?? 0;
      const leftValue = Math.max(triggerAxisLeft, triggerButtonLeft);
      const rightValue = Math.max(triggerAxisRight, triggerButtonRight);
      rotationState.gamepadInfluence = (rightValue - leftValue) * ROTATION_TRIGGER_SCALE;
      updateRotationVisual();
    } else {
      rotationState.gamepadInfluence = 0;
      gamepadVector.x = 0;
      gamepadVector.z = 0;
      updateJoystickVisual();
      updateRotationVisual();
    }
    setTimeout(pollGamepadAndMove, GAMEPAD_POLL_MS);
  }
  pollGamepadAndMove();

  updatePoseReadout();
  updateJoystickVisual();
  updateRotationVisual();

  return posControls;
}
