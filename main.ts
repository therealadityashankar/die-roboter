
import * as THREE from 'three'
import { AmmoPhysics, ExtendedMesh, ExtendedObject3D, PhysicsLoader } from '@enable3d/ammo-physics'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SO101, LeKiwi, createJointSliders } from './src';
import { Robot } from './src/robots/Robot';
import { createGrassGrid } from './src/utils/createGrassGrid';
import { loadAsset } from './src/utils/loadAsset';
import { createTree } from './src/utils/createTree';
import { createTable } from './src/utils/createTable';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { TextureLoader } from 'three'


const MainScene = async () => {
  let so101Robot: SO101 | null = null
  let leKiwiRobot: LeKiwi | null = null
  let activeRobotKey: 'lekiwi' | 'so101' = 'lekiwi'
  // scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf3f4f6)

  // physics
  // @ts-expect-error
  const physics = new AmmoPhysics(scene, {parent : "robot-view"})
  // @.ts-expect-error
  //physics.debug.enable(true)


  // renderer
  const renderer = new THREE.WebGLRenderer()
  renderer.setSize(window.innerWidth, window.innerHeight)
  const container = document.getElementById('robot-view')
  if(container){
    container.appendChild(renderer.domElement)
  }

  const loader = new GLTFLoader()
  const fbxLoader = new FBXLoader();
  const textureLoader = new TextureLoader();
  const mtlLoader = new MTLLoader();
  const objLoader = new OBJLoader();

  const table = await createTable({
    mtlLoader,
    objLoader,
    physics,
    scene,
    type: 'dining',
    position: new THREE.Vector3(-5, 0.5, -6),
    rotation: new THREE.Vector3(0, Math.PI / 2, 0),
    scale: 0.025,
    onProgress: (phase, percent) => {
      const label = phase === 'materials' ? 'table materials' : 'table OBJ';
      console.log(`${percent.toFixed(2)}% loaded (${label})`);
    },
  });

  const bun = await loadAsset({
    loader,
    scene,
    path: 'burger-bun-bread/source/bun.glb',
    position: { x: -3, y: 3, z: -8 },
    userData: { grippable: true },
    addToScene: true,
    onProgress: undefined,
  });

  const patty = await loadAsset({
    loader,
    scene,
    path: 'cooked-burger-patty-meatball/source/cooked.glb',
    position: { x: -3, y: 3, z: -4 },
    userData: { grippable: true },
    onProgress: (percent) => {
      console.log(`${percent.toFixed(2)}% loaded (burger patty)`);
    },
  });

  const bunClone = await loadAsset({
    loader,
    scene,
    path: 'burger-bun-bread/source/bun.glb',
    position: { x: -7, y: 3, z: -8 },
    friction: 5,
    userData: { grippable: true },
    onProgress: (percent) => {
      console.log(`${percent.toFixed(2)}% loaded (burger bun)`);
    },
  });

  table.addObjectAbove(bun, {
    deltaY: 5,
    physicsOptions: { shape: 'box' }
  });

  table.addObjectAbove(bunClone, {
    deltaY: 5,
    physicsOptions: { shape: 'box' }
  });

  table.addObjectAbove(patty, {
    deltaY: 5,
    physicsOptions: { shape: 'box' }
  });

  await createGrassGrid({
    loader,
    scene,
    path: 'grass/sketch.gltf',
    gridX: 2,
    gridZ: 2,
    spacing: 4,
    basePosition: new THREE.Vector3(4, 0.5, -12),
    scale: 8,
    color: 0x00aa00,
    roughness: 0.8,
    metalness: 0,
    randomizeRotation: true,
    showAxesHelper: false
  });

  await createGrassGrid({
    loader,
    scene,
    path: 'grass/sketch.gltf',
    gridX: 2,
    gridZ: 3,
    spacing: 4,
    basePosition: new THREE.Vector3(5, 0.5, -3),
    scale: 8,
    color: 0x00aa00,
    roughness: 0.8,
    metalness: 0,
    randomizeRotation: true,
    showAxesHelper: false
  });

  await createGrassGrid({
    loader,
    scene,
    path: 'grass/sketch.gltf',
    gridX: 5,
    gridZ: 3,
    spacing: 4,
    basePosition: new THREE.Vector3(-5, 0.5, -3),
    scale: 8,
    color: 0x00aa00,
    roughness: 0.8,
    metalness: 0,
    randomizeRotation: true,
    showAxesHelper: false
  });

  console.log("loaded grass grid")


  const mangoTree = await createTree({
    loader: fbxLoader,
    textureLoader,
    type: 'mango',
    position: new THREE.Vector3(8, 0, -5),
    scale: 0.02,
  });

  if (mangoTree) {
    scene.add(mangoTree);
  }


  // dpr
  const DPR = window.devicePixelRatio
  renderer.setPixelRatio(Math.min(2, DPR))


  // camera
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
  const controls = new OrbitControls(camera, renderer.domElement)

  camera.position.set(-32.539, 23.815, 4.334);
  controls.target.set(1.952, -3.623, -1.269);
  camera.lookAt(1.952, -3.623, -1.269);
  controls.update()

  // log the orbit control location each time it's changed
  controls.addEventListener('change', () => {
    const p = camera.position;
    const t = controls.target;
    console.log(
      [
        `camera.position.set(${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)});`,
        `controls.target.set(${t.x.toFixed(3)}, ${t.y.toFixed(3)}, ${t.z.toFixed(3)});`,
        `camera.lookAt(${t.x.toFixed(3)}, ${t.y.toFixed(3)}, ${t.z.toFixed(3)});`,
      ].join('\n')
    );
  });


  // light
  scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 1))
  scene.add(new THREE.AmbientLight(0xffffff, 1))
  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(50, 200, 100)
  light.position.multiplyScalar(1.3)

  // static ground
  physics.add.ground({ width: 20, height: 20, name: "ground" })

  // Helper to clear and rebuild sliders for the active robot
  const slidersContainerId = 'joint-sliders-active'
  const DEFAULT_POSES: Record<'lekiwi' | 'so101', { position: { x: number; y: number; z: number }; rotationDegrees: number }> = {
    lekiwi: {
      position: { x: -1.23, y: 1, z: -2.23 },
      rotationDegrees: -115.5,
    },
    so101: {
      position: { x: 0, y: 0.5, z: 0 },
      rotationDegrees: 0,
    },
  }

  const applyDefaultPose = (robot: SO101 | LeKiwi, key: 'lekiwi' | 'so101') => {
    if (!robot.robot) return
    const pose = DEFAULT_POSES[key]
    robot.robot.position.set(pose.position.x, pose.position.y, pose.position.z)
    robot.robot.rotation.z = THREE.MathUtils.degToRad(pose.rotationDegrees)
    Robot.markLinksAsNeedingPhysicsUpdate(robot.robot)
    robot.updateGrippedObjectPositions()
  }

  const buildSliders = (robot: SO101 | LeKiwi) => {
    // Clear container
    const container = document.getElementById(slidersContainerId)
    if (container) container.innerHTML = ''

    // Provide default UI values per robot
    const defaults = {
      "gripper": 7.26,
      "shoulder_pan": 2.58,
      "shoulder_lift": -21.94,
      "elbow_flex": -25,
      "wrist_flex": -79.35,
      "wrist_roll": 59
    }
    createJointSliders(robot, {
      containerId: slidersContainerId,
      defaultValues: defaults
    });
    
  }

  // Load LeKiwi by default
  leKiwiRobot = new LeKiwi()
  await leKiwiRobot.load({ scene, enable3dPhysicsObject: physics, position: new THREE.Vector3(0, 1, 0) })
  applyDefaultPose(leKiwiRobot, 'lekiwi')
  activeRobotKey = 'lekiwi'
  buildSliders(leKiwiRobot)

  // clock
  const clock = new THREE.Clock()

  // Robot switch buttons
  const btnLeKiwi = document.getElementById('btn-lekiwi') as HTMLButtonElement | null
  const btnSO101 = document.getElementById('btn-so101') as HTMLButtonElement | null

  const setActiveButton = (key: 'lekiwi' | 'so101') => {
    btnLeKiwi?.classList.toggle('active', key === 'lekiwi')
    btnSO101?.classList.toggle('active', key === 'so101')
  }

  const removeRobotFromScene = (robot: SO101 | LeKiwi | null) => {
    if (!robot || !robot.robot) return
    // Remove URDF root from scene; physics bodies are attached to links and will be GC'ed with meshes
    scene.remove(robot.robot)
  }

  const getRobotXZ = (robot: SO101 | LeKiwi | null): { x: number, z: number } => {
    if (!robot || !robot.robot) return { x: 0, z: 0 }
    const pos = robot.robot.position
    return { x: pos.x, z: pos.z }
  }

  const switchRobot = async (target: 'lekiwi' | 'so101') => {
    if (activeRobotKey === target) return
    // Capture current XZ of the active robot
    const { x, z } = target === 'so101' ? getRobotXZ(leKiwiRobot) : getRobotXZ(so101Robot)

    // Remove current
    if (activeRobotKey === 'lekiwi') {
      removeRobotFromScene(leKiwiRobot)
    } else {
      removeRobotFromScene(so101Robot)
    }

    // Load target at same XZ; use preferred Y per robot
    if (target === 'so101') {
      const isFirstLoad = !so101Robot
      if (!so101Robot) so101Robot = new SO101()
      await so101Robot.load({ scene, enable3dPhysicsObject: physics, position: new THREE.Vector3(x, 0.5, z) })
      if (isFirstLoad) {
        applyDefaultPose(so101Robot, 'so101')
      }
      buildSliders(so101Robot)
    } else {
      const isFirstLoad = !leKiwiRobot
      if (!leKiwiRobot) leKiwiRobot = new LeKiwi()
      await leKiwiRobot.load({ scene, enable3dPhysicsObject: physics, position: new THREE.Vector3(x, 1, z) })
      if (isFirstLoad) {
        applyDefaultPose(leKiwiRobot, 'lekiwi')
      }
      buildSliders(leKiwiRobot)
    }

    activeRobotKey = target
    setActiveButton(target)
  }

  btnLeKiwi?.addEventListener('click', () => switchRobot('lekiwi'))
  btnSO101?.addEventListener('click', () => switchRobot('so101'))

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