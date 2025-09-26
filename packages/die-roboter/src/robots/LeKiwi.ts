import { ExtendedMesh } from 'enable3d';
import { Robot, UnmappedPivotMap } from './Robot';
import { SO101 } from './SO101';
import * as THREE from 'three';

/**
 * SO101 Robot Implementation
 * The first robot in the Die Roboter series
 * 
 * taken from here : https://github.com/huggingface/lerobot/blob/945e1ff2669bb7b31cb7fe6033fe9679767c2442/src/lerobot/teleoperators/so100_leader/so100_leader.py#L47
 */
export class LeKiwi extends Robot {
  // Static method to create a cube mesh for physics representation
  static createCubeMesh(
    dimensions: number[], 
    position?: [number, number, number], 
    rotation?: [number, number, number]
  ): ExtendedMesh {
    const geometry = new THREE.BoxGeometry(dimensions[0], dimensions[1], dimensions[2]);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const mesh = new ExtendedMesh(geometry, material);
    
    // Apply position if provided
    if (position) {
      mesh.position.set(position[0], position[1], position[2]);
    }
    
    // Apply rotation if provided
    if (rotation) {
      mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    }
    
    return mesh;
  }
  constructor(){
    // Create a base physics representation for the robot
    const basePhysicsRepresentation = LeKiwi.createCubeMesh([1, 1, 1], [0, 1, 0], [0, 0, 0]);


    // Create cube meshes for physics representations with position and rotation
    const shoulderMesh = LeKiwi.createCubeMesh([.6,  .4,  .7],    [-0.25, 0, 0   ],   [0, 0, 0]);  
    const upperArmMesh = LeKiwi.createCubeMesh([1.3, .3,  .7],    [-0.4, 0, 0.2  ],   [0, 0, 0]);
    const lowerArmMesh = LeKiwi.createCubeMesh([1.3, .3,  .7],    [-0.4, 0, 0.2  ],   [0, 0, 0]);
    const wristMesh    = LeKiwi.createCubeMesh([0.3, .8,  .7],    [0, -0.2, 0.2  ],   [0, 0, 0]);
    const gripperMesh  = LeKiwi.createCubeMesh([0.2, .8,  .7],    [-0.2, 0, -0.65],   [0, 0, 0]);
    const jawMesh      = LeKiwi.createCubeMesh([0.2, .8,  .7],    [0, -0.5, 0.2 ],   [0, 0, 0]);
    const base         = LeKiwi.createCubeMesh([0.7, .7,  .7],    [0, 0, 0.34 ],   [0, 0, 0]);
    
    // SO101 has the same joints as LeKiwi, but with different names
    const unmappedPivotMap: UnmappedPivotMap = {
      'gripper': { // done - works
        name: 'gripper',
        jointName: 'STS3215_03a-v1-4_Revolute-57',
        value: 0,
        lower: 0,
        upper: 100,
        physicsRepresentation: {}
      },
      'shoulder_pan': { // done - works, angle corrected
        name: 'shoulder_pan',
        jointName: 'STS3215_03a-v1_Revolute-45',
        value: 0,
        lower: -100,
        upper: 100,
        physicsRepresentation: {}
      },
      'shoulder_lift': { // done - works, angle corrected
        name: 'shoulder_lift',
        jointName: 'STS3215_03a-v1-1_Revolute-49',
        value: 0,
        lower: -100,
        upper: 100,
        physicsRepresentation: {}
      },
      'elbow_flex': { // done - works, angle corrected
        name: 'elbow_flex',
        jointName: 'STS3215_03a-v1-2_Revolute-51',
        value: 0,
        lower: -100,
        upper: 100,
        physicsRepresentation: {},
      },
      'wrist_flex': { // done - works, angle corrected
        name: 'wrist_flex',
        jointName: 'STS3215_03a-v1-3_Revolute-53',
        value: 0,
        lower: -100,
        upper: 100,
        physicsRepresentation: {}
      },
      'wrist_roll': { // done - works, angle corrected
        name: 'wrist_roll',
        jointName: 'STS3215_03a_Wrist_Roll-v1_Revolute-55',
        value: 0,
        lower: -100,
        upper: 100,
        physicsRepresentation: {},
      },
    }; 
    
    // SO101 has the same links as LeKiwi, but with different names
    const linkPhysicsMap = {
      'Moving_Jaw_08d-v1': {
        physicsMesh: SO101.jawMesh,
        color: new THREE.Color(0x00ff00)
      },
    }
    // Call super with options object
    super({
      name: "LeKiwi",
      // temporary change, needs to be reverted to https://cdn.jsdelivr.net/gh/therealadityashankar/die-roboter/urdf/
      // before pushing
      modelPath: "http://localhost:1234/urdf/lekiwi/LeKiwi.urdf", 
      unmappedPivotMap,
      basePhysicsRepresentation,
      linkPhysicsMap
    });
  }
}