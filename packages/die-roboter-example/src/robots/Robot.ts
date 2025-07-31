import URDFLoader, { URDFRobot } from 'urdf-loader';
import * as THREE from 'three';

// Define the base structure for a pivot without mapped values
interface UnmappedPivot {
  name: string;       // Display name for the pivot
  jointName: string;  // Name of the corresponding joint in the URDF
  value: number;      // Current value
  lower: number;      // Lower limit
  upper: number;      // Upper limit
}

// Define the structure for a fully mapped pivot (extends UnmappedPivot with mapping properties)
interface Pivot extends UnmappedPivot {
  mappedLower: number; // Mapped lower limit for UI/external use
  mappedUpper: number; // Mapped upper limit for UI/external use
}

// Define the PivotMap interface
interface PivotMap {
  [key: string]: Pivot;
}

// Define the UnmappedPivotMap interface for initialization
interface UnmappedPivotMap {
  [key: string]: UnmappedPivot;
}

/**
 * Interface for all robot implementations
 */
export abstract class Robot extends THREE.Object3D {
  public name: string;
  public modelPath: string;
  public robot : URDFRobot | null;
  private _initializationStatus : string;
  public pivotMap : PivotMap

  constructor(name: string, modelPath: string, unmappedPivotMap: UnmappedPivotMap = {}) {
    super()
    this.name = name
    this.modelPath = modelPath
    this.robot = null;
    
    // Convert UnmappedPivotMap to PivotMap by adding default mappedLower and mappedUpper
    this.pivotMap = {};
    Object.entries(unmappedPivotMap).forEach(([key, unmappedPivot]) => {
      this.pivotMap[key] = {
        ...unmappedPivot,
        // Default to using the same range for mapped values
        mappedLower: unmappedPivot.lower,
        mappedUpper: unmappedPivot.upper
      };
    });
    
    this._initializationStatus = "uninitialized"
  }

  get initializationStatus() : string{
    return this._initializationStatus
  }

  async load(options?: { urdfLoaderOptions: any }){
    return this.loadModel(options)
  }

  
  async loadModel(options?: { urdfLoaderOptions: any }){
    this._initializationStatus = "loading"
    const urdfLoaderOptions = options?.urdfLoaderOptions || []
    const loader = new URDFLoader(...urdfLoaderOptions);
    const robot  = await loader.loadAsync(this.modelPath)
    const scale = 15
    robot.scale.set(scale, scale, scale);
    this.robot = robot;

    // Update the mapped joint limits in the pivots based on the loaded robot model
    if (robot.joints) {
      Object.values(this.pivotMap).forEach(pivot => {
        const joint = robot.joints?.[pivot.jointName];
        if (joint) {
          // Get the actual joint limits from the URDF model and update mappedLower/mappedUpper
          // These are the values that the user's input will be mapped TO
          if (joint.limit?.lower === undefined) {
            console.warn(`Joint '${pivot.jointName}' has no lower limit defined in URDF. Using default value of -3.14.`);
            pivot.mappedLower = -3.14;
          } else {
            pivot.mappedLower = joint.limit.lower;
          }
          
          if (joint.limit?.upper === undefined) {
            console.warn(`Joint '${pivot.jointName}' has no upper limit defined in URDF. Using default value of 3.14.`);
            pivot.mappedUpper = 3.14;
          } else {
            pivot.mappedUpper = joint.limit.upper;
          }
          
          // The lower/upper values are kept as is - these are what the user specified
          // and are used in the UI (e.g., -100 to 100)
        } else {
          console.warn(`Joint '${pivot.jointName}' not found for pivot '${pivot.name}'. This pivot will not function correctly.`);
        }
      });
    }

    this._initializationStatus = "initialized"

    // add it for threejs
    this.add(robot)

    return robot
  }

  /**
   * set the joint value for the urdf robot
   */
  setJointValue( name : string, value : number ) : boolean{
    if(!this.robot) throw Error("robot must be initailized before calling this function")
    return this.robot.setJointValue(name, value)
  }

  /**
   * set the joint values for the urdf robot
   */
  setJointValues( jointValueDictionary : { [key: string]: number | number[]; } ) : boolean{
    if(!this.robot) throw Error("robot must be initailized before calling this function")
    return this.robot.setJointValues(jointValueDictionary)
  }

  get joints(){
    return this.robot?.joints
  }

  /**
   * Get all pivots
   */
  get pivots(): PivotMap {
    return this.pivotMap;
  }

  /**
   * Set a single pivot value and update the corresponding joint
   * @param name Name of the pivot
   * @param value Value to set
   * @returns Boolean indicating success
   */
  setPivotValue(name: string, value: number): boolean {
    if (!this.pivotMap[name]) {
      console.error(`Pivot '${name}' not found`);
      return false;
    }

    // Update pivot value
    this.pivotMap[name].value = value;
    
    // Get the pivot
    const pivot = this.pivotMap[name];
    
    // Map the value from UI range (lower/upper) to joint range (mappedLower/mappedUpper)
    const jointValue = this.mapValue(
      value, 
      pivot.lower, 
      pivot.upper,
      pivot.mappedLower, 
      pivot.mappedUpper
    );
    
    // Update the actual robot joint using the jointName
    return this.setJointValue(pivot.jointName, jointValue);
  }

  /**
   * Set multiple pivot values at once
   * @param pivotValueDictionary Dictionary of pivot names to values
   * @returns Boolean indicating success
   */
  setPivotValues(pivotValueDictionary: { [key: string]: number }): boolean {
    let success = true;
    
    // Create a joint value dictionary for the actual robot
    const jointValueDictionary: { [key: string]: number } = {};
    
    Object.entries(pivotValueDictionary).forEach(([name, value]) => {
      if (!this.pivotMap[name]) {
        console.error(`Pivot '${name}' not found`);
        success = false;
        return;
      }
      
      // Update pivot value
      this.pivotMap[name].value = value;
      
      // Get the pivot
      const pivot = this.pivotMap[name];
      
      // Map the value from UI range (lower/upper) to joint range (mappedLower/mappedUpper)
      const jointValue = this.mapValue(
        value, 
        pivot.lower, 
        pivot.upper,
        pivot.mappedLower, 
        pivot.mappedUpper
      );
      
      jointValueDictionary[pivot.jointName] = jointValue;
    });
    
    // Update the actual robot joints
    if (Object.keys(jointValueDictionary).length > 0) {
      success = success && this.setJointValues(jointValueDictionary);
    }
    
    return success;
  }

  /**
   * Map a value from one range to another using linear interpolation
   * For pivot controls, this maps from the UI control range (lower/upper) to the actual joint limits (mappedLower/mappedUpper)
   * @param value Value to map (from UI control)
   * @param fromLow Lower bound of the source range (pivot.lower, e.g. -100)
   * @param fromHigh Upper bound of the source range (pivot.upper, e.g. 100)
   * @param toLow Lower bound of the target range (pivot.mappedLower, e.g. -3.14)
   * @param toHigh Upper bound of the target range (pivot.mappedUpper, e.g. 3.14)
   * @returns Mapped value (actual joint value)
   * @private
   */
  private mapValue(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number): number {
    // If the ranges are the same, no mapping needed
    if (fromLow === toLow && fromHigh === toHigh) {
      return value;
    }
    
    // Handle edge cases
    if (fromLow === fromHigh) return toLow;
    
    // Calculate the mapped value using linear interpolation
    const normalizedValue = (value - fromLow) / (fromHigh - fromLow);
    return toLow + normalizedValue * (toHigh - toLow);
  }
}
