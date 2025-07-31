import { Robot } from './Robot';

// Import the UnmappedPivotMap interface
interface UnmappedPivot {
  name: string;       // Display name for the pivot
  jointName: string;  // Name of the corresponding joint in the URDF
  value: number;      // Current value
  lower: number;      // Lower limit
  upper: number;      // Upper limit
}

interface UnmappedPivotMap {
  [key: string]: UnmappedPivot;
}

/**
 * SO101 Robot Implementation
 * The first robot in the Die Roboter series
 * 
 * taken from here : https://github.com/huggingface/lerobot/blob/945e1ff2669bb7b31cb7fe6033fe9679767c2442/src/lerobot/teleoperators/so100_leader/so100_leader.py#L47
 */
export class SO101 extends Robot {
  constructor(){
    // Define the unmapped pivot map for SO101 robot with names from the UI and -100 to 100 range
    const unmappedPivotMap: UnmappedPivotMap = {
      'shoulder_pan': {
        name: 'shoulder_pan',
        jointName: 'Rotation',
        value: 0,
        lower: -100,
        upper: 100
      },
      'shoulder_lift': {
        name: 'shoulder_lift',
        jointName: 'Pitch',
        value: 0,
        lower: -100,
        upper: 100
      },
      'elbow_flex': {
        name: 'elbow_flex',
        jointName: 'Elbow',
        value: 0,
        lower: -100,
        upper: 100
      },
      'wrist_flex': {
        name: 'wrist_flex',
        jointName: 'Wrist_Pitch',
        value: 0,
        lower: -100,
        upper: 100
      },
      'wrist_roll': {
        name: 'wrist_roll',
        jointName: 'Wrist_Roll',
        value: 0,
        lower: -100,
        upper: 100
      },
      'gripper': {
        name: 'gripper',
        jointName: 'Jaw',
        value: 50,
        lower: 0,
        upper: 100
      }
    };
    
    super("SO101", "https://cdn.jsdelivr.net/gh/therealadityashankar/die-roboter/urdf/so101.urdf", unmappedPivotMap);
  }
}
