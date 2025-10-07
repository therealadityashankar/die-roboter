import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type Vector3Like = THREE.Vector3 | { x: number; y: number; z: number };

export interface CreateGrassGridOptions {
  loader: GLTFLoader;
  scene: THREE.Scene;
  /** Relative path (from public root) to the grass GLTF file. */
  path?: string;
  /** Number of tiles along the X axis. */
  gridX?: number;
  /** Number of tiles along the Z axis. */
  gridZ?: number;
  /** Spacing between tiles. */
  spacing?: number;
  /** Base position for the first tile. */
  basePosition?: Vector3Like;
  /** Uniform scalar applied to the grass template. */
  scale?: number;
  /** Color applied to all meshes in the template. */
  color?: number;
  /** Roughness value for the material. */
  roughness?: number;
  /** Metalness value for the material. */
  metalness?: number;
  /** When true, randomizes Y rotation per tile. */
  randomizeRotation?: boolean;
  /** When true, attaches an axes helper to each grass instance. */
  showAxesHelper?: boolean;
  /** Size (length) of the axes helper lines. */
  axesSize?: number;
  /** Callback for progress updates (range 0-100). */
  onProgress?: (percent: number) => void;
}

const toVector3 = (value?: Vector3Like): THREE.Vector3 => {
  if (!value) return new THREE.Vector3();
  if (value instanceof THREE.Vector3) return value.clone();
  return new THREE.Vector3(value.x, value.y, value.z);
};

export async function createGrassGrid(options: CreateGrassGridOptions): Promise<THREE.Object3D[]> {
  const {
    loader,
    scene,
    path = 'grass/sketch.gltf',
    gridX = 5,
    gridZ = 5,
    spacing = 6,
    basePosition = new THREE.Vector3(-1, 0.5, 2),
    scale = 10,
    color = 0x00aa00,
    roughness = 0.8,
    metalness = 0,
    randomizeRotation = true,
    showAxesHelper = false,
    axesSize = 5,
    onProgress,
  } = options;

  const progressHandler = onProgress
    ? (event: ProgressEvent<EventTarget>) => {
        const percent = event.total ? (event.loaded / event.total) * 100 : 0;
        onProgress(percent);
      }
    : (event: ProgressEvent<EventTarget>) => {
        const percent = event.total ? (event.loaded / event.total) * 100 : 0;
        console.log(`${percent.toFixed(2)}% loaded (${path})`);
      };

  const gltf = await loader.loadAsync(path, progressHandler);
  const template = gltf.scene;

  template.scale.setScalar(scale);
  template.traverse((child) => {
    if ((child as any).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.material = new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        side: THREE.DoubleSide,
      });
    }
  });

  const bounds = new THREE.Box3().setFromObject(template);
  const center = bounds.getCenter(new THREE.Vector3());

  const base = toVector3(basePosition);
  const instances: THREE.Object3D[] = [];

  for (let ix = 0; ix < gridX; ix++) {
    for (let iz = 0; iz < gridZ; iz++) {
      const mesh = template.clone(true);

      // Ensure materials are not shared references after clone
      mesh.traverse((child) => {
        if ((child as any).isMesh) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map((mat) => mat.clone());
          } else if (mesh.material) {
            mesh.material = mesh.material.clone();
          }
        }
      });

      mesh.position.sub(center);

      const pivot = new THREE.Object3D();
      pivot.add(mesh);

      pivot.position.set(
        base.x + ix * spacing + center.x,
        base.y + center.y,
        base.z + iz * spacing + center.z
      );

      if (randomizeRotation) {
        pivot.rotation.y = Math.random() * Math.PI * 2;
      }

      if (showAxesHelper) {
        const axes = new THREE.AxesHelper(axesSize);
        pivot.add(axes);
      }

      scene.add(pivot);
      instances.push(pivot);
    }
  }

  return instances;
}
