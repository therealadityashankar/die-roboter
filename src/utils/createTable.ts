import * as THREE from 'three';
import { AmmoPhysics, ExtendedMesh, ExtendedObject3D } from '@enable3d/ammo-physics';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export type TableType = 'dining';

type Vector3Like = THREE.Vector3 | { x: number; y: number; z: number };

const toVector3 = (value?: Vector3Like): THREE.Vector3 | undefined => {
  if (!value) return undefined;
  if (value instanceof THREE.Vector3) return value.clone();
  return new THREE.Vector3(value.x, value.y, value.z);
};

const applyRotation = (object: THREE.Object3D, rotation?: Vector3Like) => {
  const vec = toVector3(rotation);
  if (vec) object.rotation.set(vec.x, vec.y, vec.z);
};

const applyScale = (object: THREE.Object3D, scale?: number | Vector3Like) => {
  if (typeof scale === 'number') {
    object.scale.setScalar(scale);
  } else if (scale) {
    const vec = toVector3(scale);
    if (vec) object.scale.copy(vec);
  }
};

export interface CreateTableOptions {
  mtlLoader: MTLLoader;
  objLoader: OBJLoader;
  physics: AmmoPhysics;
  type: TableType;
  scene?: THREE.Scene;
  position?: Vector3Like;
  rotation?: Vector3Like;
  scale?: number | Vector3Like;
  name?: string;
  onProgress?: (phase: 'materials' | 'model', percent: number) => void;
}

export interface AddObjectAboveOptions {
  deltaY?: number;
  addToScene?: boolean;
  physics?: AmmoPhysics;
  physicsOptions?: Record<string, unknown>;
}

class DiningTable extends ExtendedObject3D {
  readonly type: TableType = 'dining';
  private readonly physics: AmmoPhysics;
  private readonly scene?: THREE.Scene;
  private readonly dimensions: { width: number; depth: number; height: number };
  private readonly paddingY = 20; // matches previous offset behavior

  private constructor(params: {
    physics: AmmoPhysics;
    scene?: THREE.Scene;
    name?: string;
    dimensions: { width: number; depth: number; height: number };
  }) {
    super();
    this.physics = params.physics;
    this.scene = params.scene;
    this.dimensions = params.dimensions;
    if (params.name) this.name = params.name;
  }

  static async create(options: CreateTableOptions): Promise<DiningTable> {
    const {
      mtlLoader,
      objLoader,
      physics,
      scene,
      position = { x: -2.5, y: 3, z: -6 },
      rotation = { x: 0, y: Math.PI / 2, z: 0 },
      scale = 0.025,
      name,
      onProgress,
    } = options;

    const basePath = 'table/source/';
    const prevMtlPath = mtlLoader.path || '';
    const prevResourcePath = mtlLoader.resourcePath || '';
    const prevObjPath = objLoader.path || '';
    const prevMaterials = (objLoader as any).materials ?? null;

    mtlLoader.setPath(basePath);
    mtlLoader.setResourcePath(basePath);

    const materials = await mtlLoader.loadAsync('table.mtl', (event) => {
      if (onProgress) {
        const percent = event.total ? (event.loaded / event.total) * 100 : 0;
        onProgress('materials', percent);
      }
    });
    materials.preload();

    objLoader.setMaterials(materials);
    objLoader.setPath(basePath);

    const rawTable = await objLoader.loadAsync('table.obj', (event) => {
      if (onProgress) {
        const percent = event.total ? (event.loaded / event.total) * 100 : 0;
        onProgress('model', percent);
      }
    });

    // restore loaders
    objLoader.setMaterials(prevMaterials);
    objLoader.setPath(prevObjPath);
    mtlLoader.setPath(prevMtlPath);
    mtlLoader.setResourcePath(prevResourcePath);

    const table = new DiningTable({
      physics,
      scene,
      name,
      dimensions: { width: 300, depth: 430, height: 10 },
    });

    table.add(rawTable);
    applyScale(table, scale);
    applyRotation(table, rotation);
    table.position.set(position.x, position.y, position.z)

    table.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(table);
    const center = bounds.getCenter(new THREE.Vector3());
    const offset = center.sub(table.position);

    const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    material.opacity = 0;
    material.transparent = true;

    /* create a cube with the same dimensions as the table
    const physicsCube = new ExtendedMesh(
      new THREE.BoxGeometry(table.dimensions.width, table.dimensions.height, table.dimensions.depth),
      material
    );
    physicsCube.position.set(offset.x, offset.y + table.paddingY, offset.z);

    const parentWorldQuat = table.getWorldQuaternion(new THREE.Quaternion());
    const parentEuler = new THREE.Euler().setFromQuaternion(parentWorldQuat);
    const snap = (angle: number) => Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
    const snappedEuler = new THREE.Euler(snap(parentEuler.x), snap(parentEuler.y), snap(parentEuler.z));
    const snappedWorldQuat = new THREE.Quaternion().setFromEuler(snappedEuler);
    const localQuat = parentWorldQuat.clone().invert().multiply(snappedWorldQuat);
    physicsCube.quaternion.copy(localQuat);


    table.add(physicsCube);*/



    //table.physics.add.existing(physicsCube);
    table.physics.add.ground({ x: table.position.x, y: table.position.y, z: offset.z - 6, width: table.dimensions.depth*0.023, height: table.dimensions.width*0.025, depth:0.5, name: 'tabletop' })
    //physicsCube.body.setCollisionFlags(2);
    //physicsCube.body.setFriction(1);
    //physicsCube.body.setRestitution(0);

    if (scene) {
      scene.add(table);
    }

    return table;
  }

  addObjectAbove(object: THREE.Object3D, options?: AddObjectAboveOptions) {
    const {
      deltaY = 0,
      addToScene = true,
      physics,
      physicsOptions,
    } = options ?? {};

    this.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this);
    const topY = bounds.max.y;

    const targetY = topY + deltaY;
    object.position.y = targetY;

    if (addToScene && this.scene) {
      this.scene.add(object);
    }

    const physicsInstance = physics ?? this.physics;
    if (physicsInstance && physicsOptions) {
      physicsInstance.add.existing(object as any, physicsOptions);
    }
  }

  getDimensions(): { width: number; depth: number; height: number } {
    return { ...this.dimensions };
  }
}

export const createTable = async (options: CreateTableOptions): Promise<DiningTable> => {
  switch (options.type) {
    case 'dining':
      return DiningTable.create(options);
    default:
      throw new Error(`Unsupported table type: ${options.type}, currently only table type 'dining' is supported`);
  }
};
