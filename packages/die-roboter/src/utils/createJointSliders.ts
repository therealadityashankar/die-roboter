import { Robot } from '../robots/Robot';

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
