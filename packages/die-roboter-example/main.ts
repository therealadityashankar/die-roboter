
import * as THREE from 'three'
import { AmmoPhysics, ExtendedMesh, PhysicsLoader } from '@enable3d/ammo-physics'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SO101, LeKiwi, createJointSliders } from '../die-roboter/src';



const MainScene = async () => {
  const lerobot = new SO101()
  const lekiwi = new LeKiwi()
  // scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)

  // physics
  // @ts-expect-error
  const physics = new AmmoPhysics(scene, {parent : "robot-view"})
  // @ts-expect-error
  physics.debug.enable(true)
  

  // camera
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(47.564, 21.237, 43.435); 
  camera.lookAt(47.130, 20.922, 42.591); 

  // renderer
  const renderer = new THREE.WebGLRenderer()
  renderer.setSize(window.innerWidth, window.innerHeight)
  const container = document.getElementById('robot-view')
  if(container){
    container.appendChild(renderer.domElement)
  }

  // dpr
  const DPR = window.devicePixelRatio
  renderer.setPixelRatio(Math.min(2, DPR))

  // orbit controls
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(19.940, 1.147, -10.304);
  controls.update()

  // green sphere
  const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
  const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 })
  const cube = new ExtendedMesh(geometry, material)
  cube.userData.grippable = true
  cube.position.set(-4.5, 1, 0)
  scene.add(cube)
  physics.add.existing(cube)

  // light
  scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 1))
  scene.add(new THREE.AmbientLight(0xffffff, 1))
  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(50, 200, 100)
  light.position.multiplyScalar(1.3)

  // static ground
  physics.add.ground({ width: 20, height: 20, name: "ground" })

  await lerobot.load({scene, enable3dPhysicsObject : physics, position : new THREE.Vector3(0, 0.5, 0)})
  await lekiwi.load({scene, enable3dPhysicsObject : physics, position : new THREE.Vector3(5, 1, 0)})

  // clock
  const clock = new THREE.Clock()

  // Create joint sliders
  createJointSliders(lerobot, 'joint-sliders-so101', {
    "shoulder_pan": 0.00,
    "shoulder_lift": 35.00,
    "elbow_flex": -25.00,
    "wrist_flex": 86.00,
    "wrist_roll": 59.00,
    "gripper": 67.00
  });

  createJointSliders(lekiwi, 'joint-sliders-lekiwi', {
    "shoulder_pan": 0.00,
    "shoulder_lift": 35.00,
    "elbow_flex": -25.00,
    "wrist_flex": 86.00,
    "wrist_roll": 59.00,
    "gripper": 67.00
  });

  // Tabs UI to switch between slider groups
  const so101Tab = document.getElementById('tab-so101') as HTMLButtonElement | null;
  const lekiwiTab = document.getElementById('tab-lekiwi') as HTMLButtonElement | null;
  const so101Panel = document.getElementById('joint-sliders-so101');
  const lekiwiPanel = document.getElementById('joint-sliders-lekiwi');

  function setActiveTab(target: 'so101' | 'lekiwi') {
    if (!so101Tab || !lekiwiTab || !so101Panel || !lekiwiPanel) return;
    if (target === 'so101') {
      so101Tab.classList.add('active');
      so101Tab.setAttribute('aria-selected', 'true');
      lekiwiTab.classList.remove('active');
      lekiwiTab.setAttribute('aria-selected', 'false');
      so101Panel.classList.add('active');
      lekiwiPanel.classList.remove('active');
    } else {
      lekiwiTab.classList.add('active');
      lekiwiTab.setAttribute('aria-selected', 'true');
      so101Tab.classList.remove('active');
      so101Tab.setAttribute('aria-selected', 'false');
      lekiwiPanel.classList.add('active');
      so101Panel.classList.remove('active');
    }
  }

  so101Tab?.addEventListener('click', () => setActiveTab('so101'));
  lekiwiTab?.addEventListener('click', () => setActiveTab('lekiwi'));

  // Default to SO101 tab on load
  setActiveTab('so101');

  // loop
  const animate = () => {
    physics.update(clock.getDelta() * 1000)
    physics.updateDebugger()
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  requestAnimationFrame(animate)
}

// load it with the current url + /ammo/kripken
PhysicsLoader(window.location.href + 'ammo/kripken', () => MainScene())
console.log(`three.js version "${THREE.REVISION}"`)