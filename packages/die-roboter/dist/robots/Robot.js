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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Robot = void 0;
const urdf_loader_1 = __importDefault(require("urdf-loader"));
const THREE = __importStar(require("three"));
/**
 * Interface for all robot implementations
 */
class Robot extends THREE.Object3D {
    constructor(name, modelPath, unmappedPivotMap = {}) {
        super();
        this.name = name;
        this.modelPath = modelPath;
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
        this._initializationStatus = "uninitialized";
    }
    get initializationStatus() {
        return this._initializationStatus;
    }
    async load(options) {
        return this.loadModel(options);
    }
    async loadModel(options) {
        this._initializationStatus = "loading";
        const urdfLoaderOptions = options?.urdfLoaderOptions || [];
        const loader = new urdf_loader_1.default(...urdfLoaderOptions);
        const robot = await loader.loadAsync(this.modelPath);
        const scale = 15;
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
                    }
                    else {
                        pivot.mappedLower = joint.limit.lower;
                    }
                    if (joint.limit?.upper === undefined) {
                        console.warn(`Joint '${pivot.jointName}' has no upper limit defined in URDF. Using default value of 3.14.`);
                        pivot.mappedUpper = 3.14;
                    }
                    else {
                        pivot.mappedUpper = joint.limit.upper;
                    }
                    // The lower/upper values are kept as is - these are what the user specified
                    // and are used in the UI (e.g., -100 to 100)
                }
                else {
                    console.warn(`Joint '${pivot.jointName}' not found for pivot '${pivot.name}'. This pivot will not function correctly.`);
                }
            });
        }
        this._initializationStatus = "initialized";
        // add it for threejs
        this.add(robot);
        return robot;
    }
    /**
     * set the joint value for the urdf robot
     */
    setJointValue(name, value) {
        if (!this.robot)
            throw Error("robot must be initailized before calling this function");
        return this.robot.setJointValue(name, value);
    }
    /**
     * set the joint values for the urdf robot
     */
    setJointValues(jointValueDictionary) {
        if (!this.robot)
            throw Error("robot must be initailized before calling this function");
        return this.robot.setJointValues(jointValueDictionary);
    }
    get joints() {
        return this.robot?.joints;
    }
    /**
     * Get all pivots
     */
    get pivots() {
        return this.pivotMap;
    }
    /**
     * Set a single pivot value and update the corresponding joint
     * @param name Name of the pivot
     * @param value Value to set
     * @returns Boolean indicating success
     */
    setPivotValue(name, value) {
        if (!this.pivotMap[name]) {
            console.error(`Pivot '${name}' not found`);
            return false;
        }
        // Update pivot value
        this.pivotMap[name].value = value;
        // Get the pivot
        const pivot = this.pivotMap[name];
        // Map the value from UI range (lower/upper) to joint range (mappedLower/mappedUpper)
        const jointValue = this.mapValue(value, pivot.lower, pivot.upper, pivot.mappedLower, pivot.mappedUpper);
        // Update the actual robot joint using the jointName
        return this.setJointValue(pivot.jointName, jointValue);
    }
    /**
     * Set multiple pivot values at once
     * @param pivotValueDictionary Dictionary of pivot names to values
     * @returns Boolean indicating success
     */
    setPivotValues(pivotValueDictionary) {
        let success = true;
        // Create a joint value dictionary for the actual robot
        const jointValueDictionary = {};
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
            const jointValue = this.mapValue(value, pivot.lower, pivot.upper, pivot.mappedLower, pivot.mappedUpper);
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
    mapValue(value, fromLow, fromHigh, toLow, toHigh) {
        // If the ranges are the same, no mapping needed
        if (fromLow === toLow && fromHigh === toHigh) {
            return value;
        }
        // Handle edge cases
        if (fromLow === fromHigh)
            return toLow;
        // Calculate the mapped value using linear interpolation
        const normalizedValue = (value - fromLow) / (fromHigh - fromLow);
        return toLow + normalizedValue * (toHigh - toLow);
    }
}
exports.Robot = Robot;
