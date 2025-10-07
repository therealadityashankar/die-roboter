import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

type TreeType = 'mango';
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

const applyScale = (object: THREE.Object3D, scale?: number | Vector3Like) => {
  if (typeof scale === 'number') {
    object.scale.setScalar(scale);
  } else if (scale) {
    const vec = toVector3(scale);
    if (vec) object.scale.copy(vec);
  }
};

export interface CreateTreeOptions {
  loader: FBXLoader;
  textureLoader: THREE.TextureLoader;
  type: TreeType;
  position?: Vector3Like;
  scale?: number | Vector3Like;
}

const setSRGB = (texture: THREE.Texture) => {
  texture.flipY = false;
  if ('colorSpace' in texture && (texture as any).colorSpace !== undefined) {
    (texture as any).colorSpace = THREE.SRGBColorSpace;
  }
};

const createMangoTree = async (
  loader: FBXLoader,
  textureLoader: THREE.TextureLoader,
  options: CreateTreeOptions
): Promise<THREE.Object3D> => {
  loader.setResourcePath('mango-tree/textures/');

  const [tree, trunkTexture, trunkNormal, leafTexture] = await Promise.all([
    loader.loadAsync('mango-tree/source/tree3.fbx'),
    textureLoader.loadAsync('mango-tree/textures/Trunk_albedo.png'),
    textureLoader.loadAsync('mango-tree/textures/Trunk_Normal.png'),
    textureLoader.loadAsync('mango-tree/textures/mango-leaf.png'),
  ]);

  setSRGB(trunkTexture);
  setSRGB(leafTexture);
  trunkNormal.flipY = false;

  const classifyMaterial = (name: string) => {
    const lower = name.toLowerCase();
    if (!lower || lower === 'material.002' || lower.includes('trunk') || lower.includes('bark') || lower.includes('wood')) {
      return 'trunk' as const;
    }
    if (lower === 'material.001' || lower === 'material.004' || lower.includes('leaf') || lower.includes('foliage') || lower.includes('crown')) {
      return 'leaf' as const;
    }
    return 'other' as const;
  };

  const remapMaterial = (material: THREE.Material, meshName: string) => {
    const classification = classifyMaterial(material.name || meshName);

    if (classification === 'trunk') {
      return new THREE.MeshStandardMaterial({
        map: trunkTexture,
        normalMap: trunkNormal,
        roughness: 0.8,
        metalness: 0.05,
      });
    }

    if (classification === 'leaf') {
      return new THREE.MeshStandardMaterial({
        map: leafTexture,
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide,
        depthWrite: true,
      });
    }

    return typeof (material as any).clone === 'function' ? (material as any).clone() : material;
  };

  tree.traverse((child) => {
    if (!(child as any).isMesh) return;
    const mesh = child as THREE.Mesh;
    const original = mesh.material;

    if (Array.isArray(original)) {
      mesh.material = original.map((mat) => remapMaterial(mat as THREE.Material, mesh.name));
    } else if (original) {
      mesh.material = remapMaterial(original as THREE.Material, mesh.name);
    }
  });

  applyScale(tree, options.scale ?? 0.02);
  applyVector3(tree.position, options.position ?? new THREE.Vector3(8, 0, -5));

  return tree;
};

export const createTree = async (options: CreateTreeOptions): Promise<THREE.Object3D | null> => {
  const { loader, textureLoader, type } = options;

  switch (type) {
    case 'mango':
      return createMangoTree(loader, textureLoader, options);
    default:
      console.warn(`Unsupported tree type: ${type}`);
      return null;
  }
};
