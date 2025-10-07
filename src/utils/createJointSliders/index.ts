import { Robot } from '../../robots/Robot';
import { showGamepad } from '../gamepad';
import { resolveDefaultPivotValues } from './defaults';
import { setupPanels } from './layout';
import { createMovementControls } from './movementControls';
import type { CreateJointSlidersOptions, DefaultPivotValues } from './types';

export type { DefaultPivotValues } from './types';

type LegacyOptions = {
  containerId: string;
  defaultValues?: DefaultPivotValues;
};

function normalizeOptions(
  containerOrOptions?: string | CreateJointSlidersOptions,
  legacyDefaults?: DefaultPivotValues
): LegacyOptions {
  if (typeof containerOrOptions === 'string') {
    return {
      containerId: containerOrOptions,
      defaultValues: legacyDefaults,
    };
  }

  return {
    containerId: containerOrOptions?.containerId ?? 'joint-sliders',
    defaultValues: containerOrOptions?.defaultValues ?? legacyDefaults,
  };
}

export function createJointSliders(
  robot: Robot,
  containerOrOptions?: string | CreateJointSlidersOptions,
  legacyDefaultValues?: DefaultPivotValues
): void {
  const { containerId, defaultValues: overrideDefaults } = normalizeOptions(
    containerOrOptions,
    legacyDefaultValues
  );
  const container = document.getElementById(containerId);
  if (!container) return;

  const defaultValues: DefaultPivotValues = resolveDefaultPivotValues(overrideDefaults);
  const { positionPanel, jointPanel } = setupPanels(container, containerId);

  // Movement + rotation controls
  positionPanel.appendChild(createMovementControls(robot));

  const collectJointAngles = (): Record<string, number> =>
    Object.fromEntries(
      Object.entries(robot.pivotMap).map(([key, pivotState]) => [key, pivotState.value])
    );

  const logJointAngles = () => {
    const angles = collectJointAngles();
    console.log('Joint angles (degrees)', angles);
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const createCopyIcon = () => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('h-4', 'w-4');

    const backRect = document.createElementNS(SVG_NS, 'rect');
    backRect.setAttribute('x', '7');
    backRect.setAttribute('y', '7');
    backRect.setAttribute('width', '12');
    backRect.setAttribute('height', '12');
    backRect.setAttribute('rx', '2');
    backRect.setAttribute('fill', 'none');
    backRect.setAttribute('stroke', 'currentColor');
    backRect.setAttribute('stroke-width', '1.5');

    const frontRect = document.createElementNS(SVG_NS, 'rect');
    frontRect.setAttribute('x', '3');
    frontRect.setAttribute('y', '3');
    frontRect.setAttribute('width', '12');
    frontRect.setAttribute('height', '12');
    frontRect.setAttribute('rx', '2');
    frontRect.setAttribute('fill', 'none');
    frontRect.setAttribute('stroke', 'currentColor');
    frontRect.setAttribute('stroke-width', '1.5');

    svg.appendChild(backRect);
    svg.appendChild(frontRect);
    return svg;
  };

  // Gamepad helper
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

  // Sliders for each joint
  Object.entries(robot.pivotMap).forEach(([key, pivot]) => {
    if (!pivot.physicsRepresentation) return;

    const sliderWrapper = document.createElement('div');
    sliderWrapper.className = 'flex flex-col gap-1';

    const label = document.createElement('label');
    label.className = 'text-xs font-semibold uppercase tracking-wide text-gray-600';
    label.innerText = `${key}: ${pivot.value.toFixed(2)}`;
    sliderWrapper.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = pivot.lower.toString();
    slider.max = pivot.upper.toString();
    slider.value = defaultValues[key]?.toString() || '0';
    slider.step = '0.01';
    slider.className = 'range range-sm w-full';

    function updateValues() {
      const value = parseFloat(slider.value);
      label.innerText = `${key}: ${value.toFixed(2)}`;
      robot.setPivotValue(pivot.name, value);
      logJointAngles();
    }

    slider.addEventListener('input', updateValues);
    updateValues();

    sliderWrapper.appendChild(slider);
    jointPanel.appendChild(sliderWrapper);
  });

  if (Object.keys(robot.pivotMap).length > 0) {
    const copyWrapper = document.createElement('div');
    copyWrapper.className = 'pt-2 flex justify-start';

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'inline-flex items-center gap-2 px-3 py-1 text-xs sm:text-sm rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors';
    const defaultCopyText = 'Copy as JSON';

    const textSpan = document.createElement('span');
    textSpan.textContent = defaultCopyText;

    copyButton.appendChild(createCopyIcon());
    copyButton.appendChild(textSpan);

    copyButton.addEventListener('click', async () => {
      const payload = JSON.stringify(collectJointAngles(), null, 2);
      try {
        await navigator.clipboard.writeText(payload);
        textSpan.textContent = 'Copied!';
        setTimeout(() => {
          textSpan.textContent = defaultCopyText;
        }, 2000);
      } catch (error) {
        console.error('Failed to copy joint angles', error);
        textSpan.textContent = 'Copy failed';
        setTimeout(() => {
          textSpan.textContent = defaultCopyText;
        }, 2000);
      }
    });

    copyWrapper.appendChild(copyButton);
    jointPanel.appendChild(copyWrapper);
  }
}
