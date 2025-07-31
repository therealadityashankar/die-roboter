// Import from the local copy of the robot files
import { SO101 } from './robots/SO101';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
// Set background color to white
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Add smooth damping effect
controls.dampingFactor = 0.05;
controls.minDistance = 2;
controls.maxDistance = 20;

// Add directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Add ambient light for better overall illumination
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

camera.position.z = 5;

function animate() {
  // Update controls in animation loop for smooth damping effect
  controls.update();
  renderer.render( scene, camera );
}

// Define pivot keys as a type to avoid TypeScript errors
type PivotKey = 'shoulder_pan' | 'shoulder_lift' | 'elbow_flex' | 'wrist_flex' | 'wrist_roll' | 'gripper';

const initialValues: Record<PivotKey, number> = {
  shoulder_pan: 0,
  shoulder_lift: 0,
  elbow_flex: 0,
  wrist_flex: 0,
  wrist_roll: 0,
  gripper: 0
}

document.addEventListener('DOMContentLoaded', async () => {
  // Move renderer to the robot-view container
  const robotViewContainer = document.getElementById('robot-view');
  if (robotViewContainer) {
    robotViewContainer.appendChild(renderer.domElement);
    // Update renderer size to match container
    const updateRendererSize = () => {
      const rect = robotViewContainer.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    };
    updateRendererSize();
    window.addEventListener('resize', updateRendererSize);
  }

  // Create a new SO101 robot
  const robot = new SO101();
  await robot.load();

  robot.rotation.x = -Math.PI/2

  scene.add(robot);

  // Create sliders for each pivot
  const slidersContainer = document.getElementById('joint-sliders');
  if (slidersContainer && robot.pivots) {
    console.log("Pivots:", robot.pivots);
    // Create a slider for each pivot
    Object.entries(robot.pivots).forEach(([pivotKeyString, pivot]) => {
      // Cast the string key to our PivotKey type if it's valid
      const pivotKey = pivotKeyString as PivotKey;
      // Create container for this slider
      const sliderContainer = document.createElement('div');
      sliderContainer.className = 'slider-container';
      
      // Create label with pivot name and value display
      const labelContainer = document.createElement('div');
      labelContainer.className = 'slider-label';
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = pivot.name; // Use the friendly name from pivot
      
      const valueSpan = document.createElement('span');
      valueSpan.className = 'slider-value';
      
      // Set initial value if provided
      const initialValue = initialValues[pivotKey] !== undefined ? initialValues[pivotKey] : pivot.value;
      valueSpan.textContent = initialValue.toFixed(2);

      // Apply initial value
      if (initialValues[pivotKey] !== undefined) {
        robot.setPivotValue(pivotKey, initialValues[pivotKey]);
      }
      
      labelContainer.appendChild(nameSpan);
      labelContainer.appendChild(valueSpan);
      
      // Create the slider input
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(pivot.lower);
      slider.max = String(pivot.upper);
      slider.step = '0.05';
      slider.value = String(initialValue);
      
      // Add event listener to update the robot pivot when slider changes
      slider.addEventListener('input', () => {
        const value = parseFloat(slider.value);
        valueSpan.textContent = value.toFixed(2);
        console.log(`Setting pivot '${pivotKey}' to`, value);
        robot.setPivotValue(pivotKey, value);
      });
      
      // Append elements to the container
      sliderContainer.appendChild(labelContainer);
      sliderContainer.appendChild(slider);
      slidersContainer.appendChild(sliderContainer);
    });
  }

  console.log("Robot model loaded with", robot.joints ? Object.keys(robot.joints).length : 0, "joints");
}); 
