"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SO101 = void 0;
const enable3d_1 = require("enable3d");
const Robot_1 = require("./Robot");
const THREE = __importStar(require("three"));
/**
 * SO101 Robot Implementation
 * The first robot in the Die Roboter series
 *
 * taken from here : https://github.com/huggingface/lerobot/blob/945e1ff2669bb7b31cb7fe6033fe9679767c2442/src/lerobot/teleoperators/so100_leader/so100_leader.py#L47
 */
class SO101 extends Robot_1.Robot {
    // Static method to create a cube mesh for physics representation
    static createCubeMesh(dimensions, position, rotation) {
        const geometry = new THREE.BoxGeometry(dimensions[0], dimensions[1], dimensions[2]);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        const mesh = new enable3d_1.ExtendedMesh(geometry, material);
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
    constructor() {
        // Create a base physics representation for the robot
        const basePhysicsRepresentation = SO101.createCubeMesh([1, 1, 1], [0, 1, 0], [0, 0, 0]);
        // Create cube meshes for physics representations with position and rotation
        const shoulderMesh = SO101.createCubeMesh([.6, .4, .7], [-0.25, 0, 0], [0, 0, 0]);
        const upperArmMesh = SO101.createCubeMesh([1.3, .3, .7], [-0.4, 0, 0.2], [0, 0, 0]);
        const lowerArmMesh = SO101.createCubeMesh([1.3, .3, .7], [-0.4, 0, 0.2], [0, 0, 0]);
        const wristMesh = SO101.createCubeMesh([0.3, .8, .7], [0, -0.2, 0.2], [0, 0, 0]);
        const gripperMesh = SO101.createCubeMesh([0.2, .8, .7], [-0.2, 0, -0.65], [0, 0, 0]);
        const jawMesh = SO101.createCubeMesh([0.2, .8, .7], [0, -0.5, 0.2], [0, 0, 0]);
        const base = SO101.createCubeMesh([0.7, .7, .7], [0, 0, 0.34], [0, 0, 0]);
        // Define the unmapped pivot map for SO101 robot with names from the UI and -100 to 100 range
        const unmappedPivotMap = {
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
                physicsMesh: shoulderMesh
            },
            'upper_arm': {
                physicsMesh: upperArmMesh
            },
            'lower_arm': {
                physicsMesh: lowerArmMesh
            },
            'wrist': {
                physicsMesh: wristMesh
            },
            'gripper': {
                gripper_part_a: true,
                physicsMesh: gripperMesh
            },
            'moving_jaw_so101_v1': {
                gripper_part_b: true,
                physicsMesh: jawMesh
            },
            'baseframe': {
                physicsMesh: base
            }
        };
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
exports.SO101 = SO101;
