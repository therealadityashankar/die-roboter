import { ExtendedMesh } from 'enable3d';
import { Robot, UnmappedPivotMap } from './Robot';
import * as THREE from 'three';

/**
 * SO101 Robot Implementation
 * The first robot in the Die Roboter series
 * 
 * taken from here : https://github.com/huggingface/lerobot/blob/945e1ff2669bb7b31cb7fe6033fe9679767c2442/src/lerobot/teleoperators/so100_leader/so100_leader.py#L47
 */
export class SO101 extends Robot {
  static shoulderMesh : ExtendedMesh = SO101.createCubeMesh([.6,  .4,  .7],    [-0.25, 0, 0   ],   [0, 0, 0]);  
  static upperArmMesh : ExtendedMesh = SO101.createCubeMesh([1.3, .3,  .7],    [-0.4, 0, 0.2  ],   [0, 0, 0]);
  static lowerArmMesh : ExtendedMesh = SO101.createCubeMesh([1.3, .3,  .7],    [-0.4, 0, 0.2  ],   [0, 0, 0]);
  static wristMesh    : ExtendedMesh = SO101.createCubeMesh([0.3, .8,  .7],    [0, -0.2, 0.2  ],   [0, 0, 0]);
  static gripperMesh  : ExtendedMesh = SO101.createCubeMesh([0.2, .8,  .7],    [-0.2, 0, -0.65],   [0, 0, 0]);
  static jawMesh      : ExtendedMesh = SO101.createCubeMesh([0.2, .8,  .7],    [0, -0.5, 0.2 ],   [0, 0, 0]);
  static base         : ExtendedMesh = SO101.createCubeMesh([0.7, .7,  .7],    [0, 0, 0.34 ],   [0, 0, 0]);

  // Static method to create a cube mesh for physics representation
  static createCubeMesh(
    dimensions: number[], 
    position?: [number, number, number], 
    rotation?: [number, number, number]
  ): ExtendedMesh {
    const geometry = new THREE.BoxGeometry(dimensions[0]*0.1, dimensions[1]*0.1, dimensions[2]*0.1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const mesh = new ExtendedMesh(geometry, material);
    
    // Apply position if provided
    if (position) {
      mesh.position.set(position[0]*0.1, position[1]*0.1, position[2]*0.1);
    }
    
    // Apply rotation if provided
    if (rotation) {
      mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    }
    
    return mesh;
  }
  constructor(){
    // Create a base physics representation for the robot
    const basePhysicsRepresentation = SO101.createCubeMesh([1, 1, 1], [0, 1, 0], [0, 0, 0]);    
    // Define the unmapped pivot map for SO101 robot with names from the UI and -100 to 100 range
    const unmappedPivotMap: UnmappedPivotMap = {
      'shoulder_pan': {
        name: 'shoulder_pan',
        jointName: 'Rotation',
        value: 0,
        lower: -100,
        upper: 100,
        physicsRepresentation: {}
      },
      'shoulder_lift': {
        name: 'shoulder_lift',
        jointName: 'Pitch',
        value: 0,
        lower: -100,
        upper: 100,
        physicsRepresentation: {}
      },
      'elbow_flex': {
        name: 'elbow_flex',
        jointName: 'Elbow',
        value: 0,
        lower: -100,
        upper: 100,
        physicsRepresentation: {},
      },
      'wrist_flex': {
        name: 'wrist_flex',
        jointName: 'Wrist_Pitch',
        value: 0,
        lower: -100,
        upper: 100,
        physicsRepresentation: {}
      },
      'wrist_roll': {
        name: 'wrist_roll',
        jointName: 'Wrist_Roll',
        value: 0,
        lower: -100,
        upper: 100,
        physicsRepresentation: {},
      },
      'gripper': {
        name: 'gripper',
        jointName: 'Jaw',
        value: 50,
        lower: 0,
        upper: 100,
        physicsRepresentation: {}
      }
    }; 
    
    
    const linkPhysicsMap = {
      'shoulder': {
        physicsMesh: SO101.shoulderMesh
      },
      'upper_arm': {
        physicsMesh: SO101.upperArmMesh
      },
      'lower_arm': {
        physicsMesh: SO101.lowerArmMesh
      },
      'wrist': {
        physicsMesh: SO101.wristMesh
      },
      'gripper': {
        gripper_part_a : true,
        physicsMesh: SO101.gripperMesh
      },
      'moving_jaw_so101_v1': {
        gripper_part_b : true,
        physicsMesh: SO101.jawMesh
      },
      'baseframe': {
        physicsMesh: SO101.base
      }
    }
    // Call super with options object
    super({
      name: "SO101", 
      modelPath: "https://cdn.jsdelivr.net/gh/therealadityashankar/die-roboter/urdf/so101.urdf", 
      unmappedPivotMap,
      basePhysicsRepresentation,
      linkPhysicsMap
    });
  }
}