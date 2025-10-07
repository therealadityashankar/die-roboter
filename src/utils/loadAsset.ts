import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AmmoPhysics, ExtendedMesh } from '@enable3d/ammo-physics';

type Vector3Like = THREE.Vector3 | { x: number; y: number; z: number };

const toVector3 = (value?: Vector3Like): THREE.Vector3 | undefined => {
  if (!value) return undefined;
  if (value instanceof THREE.Vector3) return value.clone();
  return new THREE.Vector3(value.x, value.y, value.z);
};

const applyVector3 = (target: THREE.Vector3, value?: Vector3Like) => {
  const vec = toVector3(value);
  if (vec) target.copy(vec);
};

const applyRotation = (object: THREE.Object3D, rotation?: Vector3Like) => {
  const rot = toVector3(rotation);
  if (rot) {
    object.rotation.set(rot.x, rot.y, rot.z);
  }
};

const applyScale = (object: THREE.Object3D, scale?: number | Vector3Like) => {
  if (typeof scale === 'number') {
    object.scale.setScalar(scale);
  } else if (scale) {
    const vec = toVector3(scale);
    if (vec) object.scale.copy(vec);
  }
};

export interface LoadAssetOptions {
  loader: GLTFLoader;
  scene: THREE.Scene;
  path: string;
  position?: Vector3Like;
  rotation?: Vector3Like;
  friction?: number;
  scale?: number | Vector3Like;
  name?: string;
  userData?: Record<string, unknown>;
  addToScene?: boolean;
  physics?: AmmoPhysics;
  onProgress?: (percent: number) => void;
  afterLoad?: (object: THREE.Object3D) => void | Promise<void>;
}

export async function loadAsset(options: LoadAssetOptions): Promise<THREE.Object3D> {
  const {
    loader,
    scene,
    path,
    position,
    rotation,
    scale,
    name,
    friction,
    userData,
    addToScene = true,
    physics,
    onProgress,
    afterLoad,
  } = options;

  const gltf = await loader.loadAsync(
    path,
    onProgress
      ? (event: ProgressEvent<EventTarget>) => {
          const percent = event.total ? (event.loaded / event.total) * 100 : 0;
          onProgress(percent);
        }
      : undefined
  );

  const root = gltf.scene;

  if (name) root.name = name;
  if (userData) Object.assign(root.userData, userData);

  applyVector3(root.position, position);
  applyRotation(root, rotation);
  applyScale(root, scale);

  if (afterLoad) await afterLoad(root);

  if (addToScene) {
    scene.add(root);
  }

  if (physics) {
    (physics.add.existing as (obj: THREE.Object3D) => void)(root);
    if (friction) {
      (root as any as ExtendedMesh).body.setFriction(friction);
    }
  }

  return root;
}
