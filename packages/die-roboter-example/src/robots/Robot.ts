import URDFLoader, { URDFRobot } from 'urdf-loader';
import * as THREE from 'three';

/**
 * Interface for all robot implementations
 */
export abstract class Robot extends THREE.Object3D {
  public name: string;
  public modelPath: string;
  public robot : URDFRobot | null;
  private _initializationStatus : string;

  constructor(name : string, modelPath : string){
    super()
    this.name = name
    this.modelPath = modelPath
    this.robot = null;
    this._initializationStatus = "uninitialized"
  }

  get initializationStatus() : string{
    return this.initializationStatus
  }

  async load(options?: { urdfLoaderOptions: any }){
    return this.loadModel(options)
  }

  
  async loadModel(options?: { urdfLoaderOptions: any }){
    this._initializationStatus = "loading"
    const loader = new URDFLoader(...options?.urdfLoaderOptions);
    const robot  = await loader.loadAsync(this.modelPath)
    this.robot = robot;

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
}
