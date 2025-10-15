import React, { useMemo, useRef } from 'react';
import { PlanarControl } from '../planar';
import { MovementControl, RotationControl } from './index';
import { Robot } from '../robots/Robot';
import type { RobotKey, MainSceneHandle } from '../types/scene';
import { inverseKinematics2Link } from '../utils/inverseKinematics';

interface ControlPanelProps {
  activeRobot: RobotKey;
  onRobotChange: (key: RobotKey) => void;
  isPanelOpen: boolean;
  onTogglePanel: () => void;
  sceneHandle: MainSceneHandle | null;
}

const robotButtonBase =
  'px-3 py-1 text-xs bg-transparent text-gray-800 border rounded cursor-pointer ml-2 transition-colors';

const getRobotButtonClasses = (activeRobot: RobotKey, key: RobotKey) =>
  `${robotButtonBase} ${activeRobot === key ? 'border-gray-800' : 'border-gray-300'}`;

interface PlanarControlSectionProps {
  sceneHandle: MainSceneHandle | null;
}

const PlanarControlSection: React.FC<PlanarControlSectionProps> = ({ sceneHandle }) => {
  const planarControlRef = useRef<PlanarControl | null>(null);
  
  const planarControl = useMemo(() => {
    const control = new PlanarControl({
      onChange: (position, theta, circleSize) => {
        const robot = sceneHandle?.getActiveRobot();
        if (!robot) return;
        
        // Map X position (-1 to 1) to shoulder_pan (base rotation)
        const shoulderPanPivot = robot.pivotMap['shoulder_pan'];
        if (shoulderPanPivot) {
          const lower = shoulderPanPivot.lower;
          const upper = shoulderPanPivot.upper;

          // map theta.radians (which goes from 0 to PI), to lower and upper
          const value = lower + (theta.radians/Math.PI)*(upper-lower)
          robot.setPivotValue('shoulder_pan', value);
        }
        
        // Use inverse kinematics for Y position (Z in world) and circleSize (reach)
        // Map position.y (-1 to 1) to Z coordinate
        // Map circleSize to reach distance
        const shoulderLiftPivot = robot.pivotMap['shoulder_lift'];
        const elbowPivot = robot.pivotMap['elbow_flex'];
        
        if (shoulderLiftPivot && elbowPivot) {
          // Map position.y to world Z coordinate (height)
          // Assume range of -1 to 1 maps to 0 to 2 units in world space
          const targetY = (-position.y + 1); // 0 to 2
          
          // Map circleSize to reach distance X (horizontal distance from base)
          // Using configured Z range
          const zMin = planarControlRef.current?.zRangeMin ?? 0;
          const zMax = planarControlRef.current?.zRangeMax ?? 10;
          const normalizedReach = (circleSize - zMin) / (zMax - zMin);
          const targetZ = normalizedReach * 2; // 0 to 2 units reach
          
          // Link lengths (both 1 for now, can be adjusted later)
          const L1 = 1;
          const L2 = 1;
          
          // Calculate IK
          const ikResult = inverseKinematics2Link(targetZ, targetY, L1, L2);
          
          if (ikResult) {
            // theta1 = shoulder_lift, theta2 = elbow_flex
            const shoulderLiftPivot = robot.pivotMap['shoulder_lift'];
            const elbowFlexPivot = robot.pivotMap['elbow_flex'];


            // workaround, for the time being that i hope works
            let elbowTheta = 2*Math.PI - ikResult.theta2
            while (elbowTheta < elbowFlexPivot.mappedLower) {
              elbowTheta += 2*Math.PI;
            }

            while (elbowTheta > elbowFlexPivot.mappedUpper) {
              elbowTheta -= 2*Math.PI;
            }

            let shoulderLiftTheta = 2*Math.PI - ikResult.theta1
            while (shoulderLiftTheta < shoulderLiftPivot.mappedLower) {
              shoulderLiftTheta += 2*Math.PI;
            }

            while (shoulderLiftTheta > shoulderLiftPivot.mappedUpper) {
              shoulderLiftTheta -= 2*Math.PI;
            }

            // map between 0 to 1 corresponding to mappedLower to mappedUpper
            const shoulderLiftValueNormalized = (shoulderLiftTheta - shoulderLiftPivot.mappedLower) / (shoulderLiftPivot.mappedUpper - shoulderLiftPivot.mappedLower);
            const elbowFlexValueNormalized = (elbowTheta - elbowFlexPivot.mappedLower) / (elbowFlexPivot.mappedUpper - elbowFlexPivot.mappedLower);

            // map between joint.lower to joint.upper
            const shoulderLiftValue = -(shoulderLiftPivot.lower + shoulderLiftValueNormalized * (shoulderLiftPivot.upper - shoulderLiftPivot.lower))
            const elbowFlexValue = -(elbowFlexPivot.lower + elbowFlexValueNormalized * (elbowFlexPivot.upper - elbowFlexPivot.lower))
            
            robot.setPivotValue('shoulder_lift', shoulderLiftValue);
            robot.setPivotValue('elbow_flex', elbowFlexValue);
          }
        }
      },
      onGripperAngleChange: (angle) => {
        const robot = sceneHandle?.getActiveRobot();
        if (!robot) return;
        
        const wristRollPivot = robot.pivotMap['wrist_roll'];
        if (wristRollPivot) {

          // the actually physically comfortable range for angle is between
          // -26 and -50, so we need to map angles between this range to the slider

          const minAngle = -121;
          const maxAngle = -60;
          let usedAngle = angle;

          if(angle < minAngle){
            usedAngle = minAngle;
          }

          if(angle > maxAngle){
            usedAngle = maxAngle;
          }

          let normalizedAngle = (usedAngle - minAngle)/(maxAngle-minAngle);
          let pivotValue = wristRollPivot.lower + normalizedAngle * (wristRollPivot.upper - wristRollPivot.lower);
          robot.setPivotValue('wrist_roll', pivotValue);


          //console.log("wrist roll", angle)
          //robot.setPivotValue('wrist_roll', angle);
        }
      },
      onGripperMouthAngleChange: (angle) => {
        const robot = sceneHandle?.getActiveRobot();
        if (!robot) return;
        
        const gripperPivot = robot.pivotMap['gripper'];
        if (gripperPivot) {
          // Map 0-120° to gripper range
          const normalized = angle / 120;
          const gripperValue = gripperPivot.upper - (gripperPivot.lower + normalized * (gripperPivot.upper - gripperPivot.lower));
          robot.setPivotValue('gripper', gripperValue);
        }
      },
      onWristRollChange: (angleDegrees) => {
        const robot = sceneHandle?.getActiveRobot();
        if (!robot) return;
        
        const wristFlexPivot = robot.pivotMap['wrist_flex'];
        if (wristFlexPivot) {
          // Map angle to wrist_flex range
          // Normalize the angle to a reasonable range (e.g., -90 to 90 degrees maps to full range)
          const normalized = (angleDegrees + 90) / 180; // Map -90 to 90 degrees to 0 to 1
          const clampedNormalized = Math.max(0, Math.min(1, normalized));
          const wristFlexValue = wristFlexPivot.lower + clampedNormalized * (wristFlexPivot.upper - wristFlexPivot.lower);
          robot.setPivotValue('wrist_flex', -90);
        }
      },
      onWristFlexChange: (angleDegrees) => {
        const robot = sceneHandle?.getActiveRobot();
        if (!robot) return;
        
        const wristFlexPivot = robot.pivotMap['wrist_flex'];
        if (wristFlexPivot) {
          // Map angle directly to wrist_flex range
          // Normalize the angle to a reasonable range (e.g., -180 to 180 degrees maps to full range)
          const normalized = (angleDegrees + 180) / 360; // Map -180 to 180 degrees to 0 to 1
          const clampedNormalized = Math.max(0, Math.min(1, normalized));
          const wristFlexValue = wristFlexPivot.lower + clampedNormalized * (wristFlexPivot.upper - wristFlexPivot.lower);
          robot.setPivotValue('wrist_flex', wristFlexValue);
        }
      },
    });
    
    planarControlRef.current = control;
    return control;
  }, [sceneHandle]);

  const PlanarControls = useMemo(() => planarControl.renderControls(), [planarControl]);

  return <PlanarControls />;
};

export const ControlPanel : React.FC<ControlPanelProps> = ({
  activeRobot,
  onRobotChange,
  isPanelOpen,
  onTogglePanel,
  sceneHandle,
}) => {
  const handleMove = (dx: number, dz: number) => {
    const robot = sceneHandle?.getActiveRobot();
    if (!robot || !robot.robot) return;

    const anyRobot = robot as any;
    if (typeof anyRobot.moveByXZ === 'function') {
      anyRobot.moveByXZ(dx, dz);
    } else {
      robot.robot.position.x += dx;
      robot.robot.position.z += dz;
      Robot.markLinksAsNeedingPhysicsUpdate(robot.robot);
      robot.updateGrippedObjectPositions();
    }
  };

  const handleRotate = (delta: number) => {
    const robot = sceneHandle?.getActiveRobot();
    if (!robot || !robot.robot) return;

    const anyRobot = robot as any;
    if (typeof anyRobot.rotateByYaw === 'function') {
      anyRobot.rotateByYaw(delta);
    } else {
      robot.robot.rotation.z += delta;
      Robot.markLinksAsNeedingPhysicsUpdate(robot.robot);
      robot.updateGrippedObjectPositions();
    }
  };

  return (
    <div
      className={`absolute bottom-0 right-0 w-96 transition-transform duration-300 ease-in-out transform bg-gray-100 flex flex-col ${
        isPanelOpen ? 'h-full' : ''
      }`}
    >
      <div
        className={`flex-1 p-4 overflow-y-auto bg-gray-100 border border-[var(--color-gray-300)] border-b-0 ${
          isPanelOpen ? '' : 'hidden'
        }`}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold mr-4">Robot</h3>
            <div className="flex gap-2" aria-label="robot-switch">
              <button
                className={getRobotButtonClasses(activeRobot, 'lekiwi')}
                onClick={() => onRobotChange('lekiwi')}
                type="button"
              >
                LeKiwi (default)
              </button>
              <button
                className={getRobotButtonClasses(activeRobot, 'so101')}
                onClick={() => onRobotChange('so101')}
                type="button"
              >
                SO101
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 my-3" />

        <h3 className="text-lg font-semibold mb-3">Robot Control</h3>

        <div className="flex flex-col gap-4">
          <PlanarControlSection sceneHandle={sceneHandle} />
          
          <div className="flex items-start gap-4">
            <MovementControl onMove={handleMove} />
            <RotationControl onRotate={handleRotate} />
          </div>
        </div>

        <div className="text-xs text-gray-600 mt-4 leading-normal border-t border-gray-200 pt-4" aria-label="attribution">
          Burger bun 3D model:
          <a
            href="https://sketchfab.com/3d-models/burger-bun-bread-1eb53bef512a48e5b61e934748201d4e"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 no-underline hover:underline"
          >
            Burger bun bread (Sketchfab)
          </a>
          <br />
          Burger patty 3D model:
          <a
            href="https://sketchfab.com/3d-models/cooked-burger-patty-meatball-fdeae6bf467f4ec2a42147cf877365c3"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 no-underline hover:underline"
          >
            Cooked burger patty / meatball (Sketchfab)
          </a>
          <br />
          Grass 3D model by MauroGonzalezA:
          <a
            href="https://sketchfab.com/3d-models/grass-4b800e07ea3543e3870ad5e53b39d825"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 no-underline hover:underline"
          >
            Grass (Sketchfab)
          </a>
          <br />
          Mango tree 3D model by stealth86:
          <a
            href="https://sketchfab.com/3d-models/mango-tree-4b186052228d43d8b3fbb63213677de8"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 no-underline hover:underline"
          >
            Mango tree (Sketchfab)
          </a>
          <br />
          Table 3D model by Silver10211:
          <a
            href="https://sketchfab.com/3d-models/table-a28843f21d784fe98cc220ef0d1df478"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 no-underline hover:underline"
          >
            Table (Sketchfab)
          </a>
        </div>
      </div>

      <button
        id="panel-toggle"
        className="btn btn-outline btn-sm rounded-none rounded-br-sm border-[var(--color-gray-300)] w-96 cursor-pointer flex items-center justify-between bg-transparent"
        type="button"
        onClick={onTogglePanel}
      >
        <h2>Controls</h2>
        <svg
          id="chevron-icon"
          className={`w-4 h-4 text-black transition-transform duration-300 ${isPanelOpen ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};