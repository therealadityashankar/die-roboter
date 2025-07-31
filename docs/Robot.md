# Robot Base Class Documentation

## Overview

The `Robot` class serves as the foundation for all robot implementations in the Die Roboter library. It extends Three.js's `Object3D` class and provides a standardized interface for loading, controlling, and manipulating robot models defined in URDF (Unified Robot Description Format).

## Key Features

- URDF model loading and rendering in Three.js
- Pivot mapping system for intuitive joint control
- Automatic mapping between user-friendly ranges and actual joint limits
- Consistent API for all robot implementations

## Class Structure

### Interfaces

The Robot class uses several interfaces to define its data structures:

#### UnmappedPivot
```typescript
interface UnmappedPivot {
  name: string;       // Display name for the pivot
  jointName: string;  // Name of the corresponding joint in the URDF
  value: number;      // Current value
  lower: number;      // Lower limit for user control
  upper: number;      // Upper limit for user control
}
```

#### Pivot
```typescript
interface Pivot extends UnmappedPivot {
  mappedLower: number; // Mapped lower limit from URDF
  mappedUpper: number; // Mapped upper limit from URDF
}
```

#### PivotMap and UnmappedPivotMap
```typescript
interface PivotMap {
  [key: string]: Pivot;
}

interface UnmappedPivotMap {
  [key: string]: UnmappedPivot;
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Name of the robot |
| modelPath | string | URL to the URDF model file |
| robot | URDFRobot \| null | The loaded URDF robot instance |
| pivotMap | PivotMap | Map of all pivots with their properties |
| _initializationStatus | string | Current status of the robot ("uninitialized", "loading", "initialized") |

### Methods

#### Constructor
```typescript
constructor(name: string, modelPath: string, unmappedPivotMap: UnmappedPivotMap = {})
```
Creates a new Robot instance with the given name, model path, and pivot map.

#### loadModel
```typescript
async loadModel(options?: { urdfLoaderOptions: any })
```
Loads the URDF model asynchronously, scales it, and updates the pivot map with joint limits from the URDF.

#### setPivotValue
```typescript
setPivotValue(name: string, value: number): boolean
```
Sets a single pivot value and updates the corresponding joint by mapping from the user range to the joint range.

#### setPivotValues
```typescript
setPivotValues(pivotValueDictionary: { [key: string]: number }): boolean
```
Sets multiple pivot values at once, mapping each from the user range to the joint range.

#### setJointValue and setJointValues
```typescript
setJointValue(name: string, value: number): boolean
setJointValues(jointValueDictionary: { [key: string]: number | number[] }): boolean
```
Low-level methods to directly set joint values on the URDF robot.

#### mapValue
```typescript
private mapValue(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number): number
```
Maps a value from one range to another using linear interpolation.

## Pivot Mapping System

The pivot mapping system is a core concept in the Robot class that provides:

1. **Abstraction**: Separates user-facing controls from actual joint mechanics
2. **Normalization**: Allows for consistent control ranges across different robots
3. **Safety**: Prevents exceeding physical joint limits
4. **Flexibility**: Adapts to different robot models with varying joint configurations

### How Mapping Works

1. **Initialization**:
   - Robot is created with an `UnmappedPivotMap` defining user control ranges
   - Each unmapped pivot is converted to a `Pivot` with initial mapped ranges equal to user ranges

2. **Model Loading**:
   - URDF model is loaded with actual joint limits
   - The `mappedLower` and `mappedUpper` values are updated from the URDF joint limits
   - User-defined `lower` and `upper` values remain unchanged

3. **Value Setting**:
   - When setting a pivot value, it's kept within the user range (`lower` to `upper`)
   - The value is mapped from the user range to the joint range (`mappedLower` to `mappedUpper`)
   - The mapped value is applied to the actual joint

### Example

If a pivot has:
- User range: -100 to 100
- Joint limits: -1.57 to 1.57 (±90 degrees in radians)

Then:
- A user input of 0 maps to 0 radians (center position)
- A user input of 50 maps to 0.785 radians (45 degrees)
- A user input of -100 maps to -1.57 radians (-90 degrees)

## Error Handling

The Robot class includes several error handling mechanisms:

- Warns when joint limits are missing in the URDF
- Warns when a joint specified in the pivot map is not found in the URDF
- Throws an error when attempting to set joint values before initialization
- Returns false when attempting to set a non-existent pivot

## Extending the Robot Class

To create a new robot implementation, extend the Robot class and define the appropriate pivot map:

```typescript
export class MyRobot extends Robot {
  constructor() {
    const unmappedPivotMap = {
      'joint1': {
        name: 'joint1',
        jointName: 'actual_joint_name_in_urdf',
        value: 0,
        lower: -100,
        upper: 100
      },
      // Add more joints as needed
    };
    
    super("MyRobot", "path/to/urdf/model.urdf", unmappedPivotMap);
  }
}
```

## Best Practices

- Always await the `loadModel()` method before attempting to control the robot
- Use the pivot mapping system rather than directly controlling joints
- Handle initialization status appropriately in your application
- Provide meaningful names for pivots that reflect their function
- Use consistent ranges for user controls (e.g., -100 to 100) for intuitive control
