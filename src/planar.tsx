import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { Settings } from 'lucide-react';
import { IKVisualization } from './components/IKVisualization';
import { inverseKinematics2Link } from './utils/inverseKinematics';
import { SmoothedHandDetector } from './utils/SmoothedHandDetector';

type PlanarPosition = {
  x: number;
  y: number;
};

type PlanarControlOptions = {
  initialPosition?: PlanarPosition;
  onChange?: (position: PlanarPosition, theta: { radians: number; degrees: number }, circleSize: number) => void;
  initialCircleSize?: number;
  initialGripperAngle?: number;
  initialGripperMouthAngle?: number;
  onGripperAngleChange?: (angleDegrees: number) => void;
  onGripperMouthAngleChange?: (angleDegrees: number) => void;
  onWristRollChange?: (angleDegrees: number) => void;
  onWristFlexChange?: (angleDegrees: number) => void;
};

type InteractionAxis = 'x' | 'y' | 'both';

export const clampRange = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
const clampUnitRange = (value: number) => clampRange(value, -1, 1);

export const MIN_CIRCLE_REM = 0.4;
export const MAX_CIRCLE_REM = 2.4;

// Scale factor for camera-to-control mapping when hand tracking is active
// Lower value = more camera buffer (e.g., 0.7 means only center 70% of camera maps to full range)
const CAMERA_TO_CONTROL_SCALE_WITH_TRACKING = 0.7;
const CAMERA_TO_CONTROL_SCALE_WITHOUT_TRACKING = 1.0;

const INDEX_FINGER_KEYPOINT = 'index_finger_tip';
const THUMB_TIP_KEYPOINT = 'thumb_tip';
const RING_FINGER_KEYPOINT = 'ring_finger_tip';
const WRIST_KEYPOINT = 'wrist';
const MIDDLE_FINGER_MCP_KEYPOINT = 'middle_finger_mcp';
const PINKY_TIP_KEYPOINT = 'pinky_finger_tip';
const RING_FINGER_TIP_KEYPOINT = 'ring_finger_tip';

const MIN_GRIPPER_DEGREES = -180;
const MAX_GRIPPER_DEGREES = 180;
const GRIPPER_STEP_DEGREES = 1;

const MIN_GRIPPER_MOUTH_DEGREES = 0;
const MAX_GRIPPER_MOUTH_DEGREES = 120;
const GRIPPER_MOUTH_STEP_DEGREES = 1;

const MIN_WRIST_FLEX_DEGREES = -180;
const MAX_WRIST_FLEX_DEGREES = 180;
const WRIST_FLEX_STEP_DEGREES = 1;

/**
 * PlanarControl class - manages planar position control with optional hand tracking
 */
export class PlanarControl {
  private position: PlanarPosition;
  private z: number; // Depth/circle size
  private gripperAngleDegrees: number;
  private gripperMouthAngleDegrees: number;
  private wristFlexAngleDegrees: number;
  private options: PlanarControlOptions;

  // Hand tracking state
  private detector: SmoothedHandDetector | null = null;
  private mediaStream: MediaStream | null = null;
  private handTrackingActive: boolean = false;
  private detectionFrameId: number | null = null;
  private videoElement: HTMLVideoElement | null = null;
  
  // Hand keypoints for visualization
  public handKeypoints: { thumb?: any; index?: any; ring?: any; thumbTip?: any; wrist?: any; middleFingerMcp?: any; pinkyTip?: any; ringFingerTip?: any } = {};
  
  // Wrist flex rotation state (for pinky-thumb touch rotation)
  private wristFlexBaseAngle: number = 0;
  private pinkyThumbTouching: boolean = false;
  private touchStartAngle: number = 0;
  
  // Raw hand tracking position for display
  public handTrackedPosition: { x: number; y: number; z: number } | null = null;
  
  // Z range configuration for robot mapping
  public zRangeMin: number = MIN_CIRCLE_REM;
  public zRangeMax: number = MAX_CIRCLE_REM;
  
  // Dynamic camera-to-control scale (updated by component based on hand tracking state)
  public cameraToControlScale: number = CAMERA_TO_CONTROL_SCALE_WITHOUT_TRACKING;

  constructor(options: PlanarControlOptions = {}) {
    this.options = options;
    this.position = {
      x: clampUnitRange(options.initialPosition?.x ?? 0),
      y: clampUnitRange(options.initialPosition?.y ?? 0),
    };
    this.z = clampRange(
      options.initialCircleSize ?? 1,
      MIN_CIRCLE_REM,
      MAX_CIRCLE_REM
    );
    this.gripperAngleDegrees = clampRange(
      options.initialGripperAngle ?? 0,
      MIN_GRIPPER_DEGREES,
      MAX_GRIPPER_DEGREES
    );
    this.gripperMouthAngleDegrees = clampRange(
      options.initialGripperMouthAngle ?? 30,
      MIN_GRIPPER_MOUTH_DEGREES,
      MAX_GRIPPER_MOUTH_DEGREES
    );
    this.wristFlexAngleDegrees = 0; // Initialize to 0 degrees
  }

  // Public API methods
  getNormalizedPosition(): PlanarPosition {
    return { ...this.position };
  }

  setNormalizedPosition(next: PlanarPosition) {
    this.position.x = clampUnitRange(next.x);
    this.position.y = clampUnitRange(next.y);
    this.emitChange();
  }

  getCircleSize(): number {
    return this.z;
  }

  setCircleSize(sizeRem: number) {
    this.z = clampRange(sizeRem, MIN_CIRCLE_REM, MAX_CIRCLE_REM);
    this.emitChange();
  }

  getZ(): number {
    return this.z;
  }

  setZ(z: number) {
    this.z = clampRange(z, MIN_CIRCLE_REM, MAX_CIRCLE_REM);
    this.emitChange();
  }

  getGripperAngle(): number {
    return this.gripperAngleDegrees;
  }

  setGripperAngle(angleDegrees: number) {
    this.gripperAngleDegrees = clampRange(
      angleDegrees,
      MIN_GRIPPER_DEGREES,
      MAX_GRIPPER_DEGREES
    );
    this.options.onGripperAngleChange?.(this.gripperAngleDegrees);
  }

  getGripperMouthAngle(): number {
    return this.gripperMouthAngleDegrees;
  }

  setGripperMouthAngle(angleDegrees: number) {
    this.gripperMouthAngleDegrees = clampRange(
      angleDegrees,
      MIN_GRIPPER_MOUTH_DEGREES,
      MAX_GRIPPER_MOUTH_DEGREES
    );
    this.options.onGripperMouthAngleChange?.(this.gripperMouthAngleDegrees);
  }

  getWristFlexAngle(): number {
    return this.wristFlexAngleDegrees;
  }

  setWristFlexAngle(angleDegrees: number) {
    this.wristFlexAngleDegrees = clampRange(
      angleDegrees,
      MIN_WRIST_FLEX_DEGREES,
      MAX_WRIST_FLEX_DEGREES
    );
    // Update base angle so pinky-thumb rotation continues from this position
    this.wristFlexBaseAngle = this.wristFlexAngleDegrees;
    this.options.onWristFlexChange?.(this.wristFlexAngleDegrees);
  }

  // Helper methods
  private computeThetaRadians(): number {
    const clampedX = clampRange(this.position.x, -1, 1);
    return Math.PI - Math.acos(clampedX); // this goes between pi to 0
  }

  private emitChange() {
    const thetaRadians = this.computeThetaRadians();
    const thetaDegrees = thetaRadians * (180 / Math.PI);
    this.options.onChange?.(
      { ...this.position },
      { radians: thetaRadians, degrees: thetaDegrees },
      this.z
    );
  }

  private mapDepthToCircleSize(depth: number): number {
    const normalized = clampRange(depth, -1, 1);
    return MIN_CIRCLE_REM + ((normalized + 1) / 2) * (MAX_CIRCLE_REM - MIN_CIRCLE_REM);
  }

  // Hand tracking methods
  private async ensureDetector(): Promise<SmoothedHandDetector> {
    if (this.detector) return this.detector;

    await tf.ready();
    if (tf.getBackend() !== 'webgl') {
      await tf.setBackend('webgl');
      await tf.ready();
    }

    const rawDetector = await handPoseDetection.createDetector(
      handPoseDetection.SupportedModels.MediaPipeHands,
      {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        modelType: 'full',
        maxHands: 1,
      }
    );

    // Wrap with smoothing (buffer size of 5 frames, adjust as needed)
    this.detector = new SmoothedHandDetector(rawDetector, 30);

    return this.detector;
  }

  private async runDetectionFrame() {
    if (!this.handTrackingActive || !this.detector || !this.videoElement) {
      return;
    }

    try {
      if (this.videoElement.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
        this.detectionFrameId = requestAnimationFrame(() => this.runDetectionFrame());
        return;
      }

      const hands = await this.detector.estimateHands(this.videoElement, {
        flipHorizontal: true,
      });

      if (hands.length > 0) {
        const hand = hands[0];
        const indexFinger2D = hand.keypoints?.find(
          (keypoint) => keypoint.name === INDEX_FINGER_KEYPOINT
        );
        const indexFinger3D = hand.keypoints3D?.find(
          (keypoint) => keypoint.name === INDEX_FINGER_KEYPOINT
        );
        const thumbTip2D = hand.keypoints?.find(
          (keypoint) => keypoint.name === THUMB_TIP_KEYPOINT
        );
        const ringFinger2D = hand.keypoints?.find(
          (keypoint) => keypoint.name === RING_FINGER_KEYPOINT
        );
        const wrist2D = hand.keypoints?.find(
          (keypoint) => keypoint.name === WRIST_KEYPOINT
        );
        const middleFingerMcp2D = hand.keypoints?.find(
          (keypoint) => keypoint.name === MIDDLE_FINGER_MCP_KEYPOINT
        );
        const pinkyTip2D = hand.keypoints?.find(
          (keypoint) => keypoint.name === PINKY_TIP_KEYPOINT
        );
        const ringFingerTip2D = hand.keypoints?.find(
          (keypoint) => keypoint.name === RING_FINGER_TIP_KEYPOINT
        );

        // Invert x coordinates for index, thumb and wrist (they're mirrored)
        const indexFingerCorrected = indexFinger2D && this.videoElement ? {
          ...indexFinger2D,
          x: this.videoElement.videoWidth - indexFinger2D.x
        } : indexFinger2D;

        const thumbTipCorrected = thumbTip2D && this.videoElement ? {
          ...thumbTip2D,
          x: this.videoElement.videoWidth - thumbTip2D.x
        } : thumbTip2D;

        const wristCorrected = wrist2D && this.videoElement ? {
          ...wrist2D,
          x: this.videoElement.videoWidth - wrist2D.x
        } : wrist2D;

        const middleFingerMcpCorrected = middleFingerMcp2D && this.videoElement ? {
          ...middleFingerMcp2D,
          x: this.videoElement.videoWidth - middleFingerMcp2D.x
        } : middleFingerMcp2D;

        const pinkyTipCorrected = pinkyTip2D && this.videoElement ? {
          ...pinkyTip2D,
          x: this.videoElement.videoWidth - pinkyTip2D.x
        } : pinkyTip2D;

        const ringFingerTipCorrected = ringFingerTip2D && this.videoElement ? {
          ...ringFingerTip2D,
          x: this.videoElement.videoWidth - ringFingerTip2D.x
        } : ringFingerTip2D;

        // Calculate wrist roll angle (angle between wrist and middle finger MCP across Z-axis)
        let wristRollAngle = 0;
        if (wristCorrected && middleFingerMcpCorrected) {
          const dx = middleFingerMcpCorrected.x - wristCorrected.x;
          const dy = middleFingerMcpCorrected.y - wristCorrected.y;
          wristRollAngle = Math.atan2(dy, dx) * (180 / Math.PI); // Convert to degrees
        }

        // Store keypoints for visualization
        this.handKeypoints = {
          thumb: thumbTip2D,
          index: indexFingerCorrected,
          ring: ringFinger2D,
          thumbTip: thumbTipCorrected,
          wrist: wristCorrected,
          middleFingerMcp: middleFingerMcpCorrected,
          pinkyTip: pinkyTipCorrected,
          ringFingerTip: ringFingerTipCorrected,
        };

        // Emit wrist roll angle change
        this.options.onWristRollChange?.(wristRollAngle);

        // Wrist flex rotation control via pinky-thumb touch
        if (thumbTipCorrected && pinkyTipCorrected) {
          const dx = pinkyTipCorrected.x - thumbTipCorrected.x;
          const dy = pinkyTipCorrected.y - thumbTipCorrected.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
          
          const touchThreshold = 40; // pixels - adjust based on testing
          
          // Check if pinky and thumb are touching
          if (distance < touchThreshold) {
            if (!this.pinkyThumbTouching) {
              // Touch just started
              this.pinkyThumbTouching = true;
              this.touchStartAngle = currentAngle;
            } else {
              // Touch is ongoing - calculate rotation delta
              const angleDelta = currentAngle - this.touchStartAngle;
              const wristFlexAngle = this.wristFlexBaseAngle + angleDelta;
              this.wristFlexAngleDegrees = clampRange(
                wristFlexAngle,
                MIN_WRIST_FLEX_DEGREES,
                MAX_WRIST_FLEX_DEGREES
              );
              this.options.onWristFlexChange?.(this.wristFlexAngleDegrees);
            }
          } else {
            if (this.pinkyThumbTouching) {
              // Touch just released - retain the angle
              this.wristFlexBaseAngle = this.wristFlexAngleDegrees;
              this.pinkyThumbTouching = false;
            }
          }
        }

        // Position tracking using index finger
        if (
          indexFinger2D &&
          this.videoElement.videoWidth &&
          this.videoElement.videoHeight
        ) {
          // Normalize camera coordinates to 0-1 range
          const cameraX = indexFinger2D.x / this.videoElement.videoWidth;
          const cameraY = indexFinger2D.y / this.videoElement.videoHeight;

          const topCutoff = this.cameraToControlScale * 0.5
          const bottomCutoff = 1 - this.cameraToControlScale * 0.5

          let rawX = 0
          let rawY = 0

          if(cameraX < topCutoff) {
            rawX = 1
          } else if(cameraX > bottomCutoff) {
            rawX = 0
          } else {
            rawX = 1 - ((cameraX - topCutoff) / (bottomCutoff - topCutoff))
          }

          if(cameraY < topCutoff) {
            rawY = 0
          } else if(cameraY > bottomCutoff) {
            rawY = 1
          } else {
            rawY = (cameraY - topCutoff) / (bottomCutoff - topCutoff)
          }
          
          
          // Update raw hand tracked position (unclamped)
          if (!this.handTrackedPosition) {
            this.handTrackedPosition = { x: rawX, y: rawY, z: 0 };
          } else {
            this.handTrackedPosition.x = rawX;
            this.handTrackedPosition.y = rawY;
          }
          
          // Set position (will be clamped inside setNormalizedPosition)
          this.setNormalizedPosition({ x: rawX, y: rawY });
        }

        // Circle size from wrist-to-middle-finger-MCP distance
        if (wristCorrected && middleFingerMcpCorrected) {
          const dx = middleFingerMcpCorrected.x - wristCorrected.x;
          const dy = middleFingerMcpCorrected.y - wristCorrected.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Map distance to circle size
          // Larger distance = hand is closer to camera = larger circle size
          // Smaller distance = hand is farther from camera = smaller circle size
          // Typical distance range might be 50-200 pixels (adjust based on testing)
          const minDistance = 50;  // Hand far away
          const maxDistance = 200; // Hand close
          const normalizedDistance = clampRange((distance - minDistance) / (maxDistance - minDistance), 0, 1);
          const circleSize = MIN_CIRCLE_REM + normalizedDistance * (MAX_CIRCLE_REM - MIN_CIRCLE_REM);
          this.setCircleSize(circleSize);
          
          // Update raw hand tracked position (Z as normalized distance)
          if (!this.handTrackedPosition) {
            this.handTrackedPosition = { x: 0, y: 0, z: normalizedDistance * 2 - 1 }; // -1 to 1
          } else {
            this.handTrackedPosition.z = normalizedDistance * 2 - 1;
          }
        }

        // Gripper mouth angle from thumb-index distance
        if (thumbTip2D && indexFinger2D) {
          const dx = thumbTip2D.x - indexFinger2D.x;
          const dy = thumbTip2D.y - indexFinger2D.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Normalize distance to 0-1 range (assuming max distance of ~100 pixels)
          const normalizedDistance = clampRange(distance / 100, 0, 1);
          const gripperMouthAngle = normalizedDistance * MAX_GRIPPER_MOUTH_DEGREES;
          this.setGripperMouthAngle(gripperMouthAngle);
        }

        // Gripper angle from thumb-index finger line angle
        if (thumbTip2D && indexFinger2D) {
          const dx = indexFinger2D.x - thumbTip2D.x;
          const dy = indexFinger2D.y - thumbTip2D.y;
          const angleRadians = Math.atan2(dy, dx);
          const angleDegrees = angleRadians * 180 / Math.PI;
          
          // Map to gripper angle range (-90 to 90)
          const normalizedAngle = ((angleDegrees + 180) % 360 - 180);
          const gripperAngle = clampRange(normalizedAngle, MIN_GRIPPER_DEGREES, MAX_GRIPPER_DEGREES);
          this.setGripperAngle(gripperAngle);
        }
      }
    } catch (error) {
      console.error('Hand pose detection error', error);
    }

    this.detectionFrameId = requestAnimationFrame(() => this.runDetectionFrame());
  }

  /**
   * Optional method to connect camera for hand tracking
   */
  async connectCamera(videoElement: HTMLVideoElement): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('MediaDevices API unsupported in this browser');
    }

    this.videoElement = videoElement;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      this.videoElement.srcObject = this.mediaStream;
      await this.videoElement.play();

      await this.ensureDetector();

      this.handTrackingActive = true;
      this.detectionFrameId = requestAnimationFrame(() => this.runDetectionFrame());

      // Listen for track ended events
      this.mediaStream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          if (this.handTrackingActive) {
            this.disconnectCamera();
          }
        });
      });
    } catch (error) {
      console.error('Unable to start hand tracking', error);
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }
      throw error;
    }
  }

  disconnectCamera(): void {
    this.handTrackingActive = false;
    if (this.detectionFrameId !== null) {
      cancelAnimationFrame(this.detectionFrameId);
      this.detectionFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  isHandTrackingActive(): boolean {
    return this.handTrackingActive;
  }

  /**
   * Returns a React functional component that renders the controls
   */
  renderControls() {
    const control = this;

    return function PlanarControls() {
      const [position, setPosition] = useState<PlanarPosition>(
        control.getNormalizedPosition()
      );
      const [circleSize, setCircleSize] = useState(control.getCircleSize());
      const [gripperAngle, setGripperAngle] = useState(control.getGripperAngle());
      const [gripperMouthAngle, setGripperMouthAngle] = useState(
        control.getGripperMouthAngle()
      );
      const [wristFlexAngle, setWristFlexAngle] = useState(control.getWristFlexAngle());
      const [isDraggingCircleSize, setIsDraggingCircleSize] = useState(false);
      // Initialize angle based on current circle size
      const [circleSizeAngle, setCircleSizeAngle] = useState(() => {
        const initialSize = control.getCircleSize();
        return ((initialSize - MIN_CIRCLE_REM) / (MAX_CIRCLE_REM - MIN_CIRCLE_REM)) * 2 * Math.PI;
      });
      const [handTracking, setHandTracking] = useState(false);
      const [cameraButtonText, setCameraButtonText] = useState('Enable Hand Tracking');
      const [cameraButtonDisabled, setCameraButtonDisabled] = useState(false);
      const [handKeypoints, setHandKeypoints] = useState<{ thumb?: any; index?: any; ring?: any; thumbTip?: any; wrist?: any; middleFingerMcp?: any; pinkyTip?: any; ringFingerTip?: any }>({});
      const [handTrackedPosition, setHandTrackedPosition] = useState<{ x: number; y: number; z: number } | null>(null);
      const [showSettings, setShowSettings] = useState(false);
      
      // Dynamic scale factor: use buffer zone only when hand tracking is active
      const cameraToControlScale = handTracking ? CAMERA_TO_CONTROL_SCALE_WITH_TRACKING : CAMERA_TO_CONTROL_SCALE_WITHOUT_TRACKING;
      const [zRangeMin, setZRangeMin] = useState(() => {
        const saved = localStorage.getItem('planar-z-range-min');
        return saved ? parseFloat(saved) : MIN_CIRCLE_REM;
      });
      const [zRangeMax, setZRangeMax] = useState(() => {
        const saved = localStorage.getItem('planar-z-range-max');
        return saved ? parseFloat(saved) : MAX_CIRCLE_REM;
      });

      const videoRef = useRef<HTMLVideoElement>(null);
      const padRef = useRef<HTMLDivElement>(null);
      const canvasRef = useRef<HTMLCanvasElement>(null);
      const activeInteractionRef = useRef<{
        id: number;
        axis: InteractionAxis;
        target: HTMLElement;
      } | null>(null);

      const thetaRadians = gripperAngle * (Math.PI / 180);
      const thetaDegrees = gripperAngle;

      // Z range handlers
      const handleZRangeMinChange = (value: number) => {
        const clamped = clampRange(value, MIN_CIRCLE_REM, MAX_CIRCLE_REM);
        setZRangeMin(clamped);
        localStorage.setItem('planar-z-range-min', clamped.toString());
      };

      const handleZRangeMaxChange = (value: number) => {
        const clamped = clampRange(value, MIN_CIRCLE_REM, MAX_CIRCLE_REM);
        setZRangeMax(clamped);
        localStorage.setItem('planar-z-range-max', clamped.toString());
      };

      const handleResetZRange = () => {
        setZRangeMin(MIN_CIRCLE_REM);
        setZRangeMax(MAX_CIRCLE_REM);
        localStorage.removeItem('planar-z-range-min');
        localStorage.removeItem('planar-z-range-max');
      };

      // Update position from pointer
      const updateFromPointer = (event: React.PointerEvent, axis: InteractionAxis) => {
        if (!padRef.current) return;

        const rect = padRef.current.getBoundingClientRect();
        const offsetX = clampRange((event.clientX - rect.left) / rect.width, 0, 1);
        const offsetY = clampRange((event.clientY - rect.top) / rect.height, 0, 1);

        const newPosition = { ...position };
        
        if (cameraToControlScale === 1.0) {
          // Simple mapping when no buffer zone
          if (axis === 'both' || axis === 'x') {
            newPosition.x = offsetX * 2 - 1;
          }
          if (axis === 'both' || axis === 'y') {
            newPosition.y = offsetY * 2 - 1;
          }
        } else {
          // Mapping with buffer zone
          const topCutoff = cameraToControlScale * 0.5;
          const bottomCutoff = 1 - cameraToControlScale * 0.5;

          if (axis === 'both' || axis === 'x') {
            if (offsetX < topCutoff) {
              newPosition.x = 1;
            } else if (offsetX > bottomCutoff) {
              newPosition.x = -1;
            } else {
              newPosition.x = 1 - 2 * ((offsetX - topCutoff) / (bottomCutoff - topCutoff));
            }
          }
          if (axis === 'both' || axis === 'y') {
            if (offsetY < topCutoff) {
              newPosition.y = -1;
            } else if (offsetY > bottomCutoff) {
              newPosition.y = 1;
            } else {
              newPosition.y = -1 + 2 * ((offsetY - topCutoff) / (bottomCutoff - topCutoff));
            }
          }
        }

        setPosition(newPosition);
        control.setNormalizedPosition(newPosition);
      };

      // Pointer event handlers
      const handlePointerDown = (
        event: React.PointerEvent<HTMLDivElement>,
        axis: InteractionAxis
      ) => {
        event.preventDefault();
        activeInteractionRef.current = {
          id: event.pointerId,
          axis,
          target: event.currentTarget,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFromPointer(event, axis);
      };

      const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (
          !activeInteractionRef.current ||
          activeInteractionRef.current.id !== event.pointerId
        )
          return;
        updateFromPointer(event, activeInteractionRef.current.axis);
      };

      const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
        if (
          !activeInteractionRef.current ||
          activeInteractionRef.current.id !== event.pointerId
        )
          return;
        if (activeInteractionRef.current.target.hasPointerCapture(event.pointerId)) {
          activeInteractionRef.current.target.releasePointerCapture(event.pointerId);
        }
        activeInteractionRef.current = null;
      };

      // Hand tracking toggle
      const toggleHandTracking = async () => {
        if (handTracking) {
          control.disconnectCamera();
          setHandTracking(false);
          setCameraButtonText('Enable Hand Tracking');
        } else {
          if (!videoRef.current) return;

          setCameraButtonDisabled(true);
          setCameraButtonText('Starting…');

          try {
            await control.connectCamera(videoRef.current);
            setHandTracking(true);
            setCameraButtonText('Stop Hand Tracking');
          } catch (error) {
            console.error('Failed to start hand tracking', error);
            setCameraButtonText('Enable Hand Tracking');
          } finally {
            setCameraButtonDisabled(false);
          }
        }
      };

      // Sync Z range to control object
      useEffect(() => {
        control.zRangeMin = zRangeMin;
        control.zRangeMax = zRangeMax;
      }, [zRangeMin, zRangeMax]);

      // Sync camera-to-control scale based on hand tracking state
      useEffect(() => {
        control.cameraToControlScale = cameraToControlScale;
      }, [cameraToControlScale]);

      // Sync position when hand tracking updates it
      useEffect(() => {
        const interval = setInterval(() => {
          if (control.isHandTrackingActive()) {
            setPosition(control.getNormalizedPosition());
            setCircleSize(control.getCircleSize());
            setGripperAngle(control.getGripperAngle());
            setGripperMouthAngle(control.getGripperMouthAngle());
            setWristFlexAngle(control.getWristFlexAngle());
            setHandKeypoints(control.handKeypoints);
            setHandTrackedPosition(control.handTrackedPosition);
          }
        }, 50);

        return () => clearInterval(interval);
      }, []);

      // Draw hand keypoints on canvas
      useEffect(() => {
        if (!canvasRef.current || !videoRef.current) return;
        
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas internal resolution to match display size (220x220) for proper aspect ratio
        canvas.width = 220;
        canvas.height = 220;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Scale coordinates from video dimensions to canvas dimensions
        const scaleX = canvas.width / (video.videoWidth || 220);
        const scaleY = canvas.height / (video.videoHeight || 220);

        // Draw control range boundary box
        if (handTracking) {
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const boxWidth = canvas.width * cameraToControlScale;
          const boxHeight = canvas.height * cameraToControlScale;
          const boxX = centerX - boxWidth / 2;
          const boxY = centerY - boxHeight / 2;
          
          ctx.strokeStyle = '#10b981'; // green
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]); // dashed line
          ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
          ctx.setLineDash([]); // reset to solid line
        }

        if (!handTracking || !handKeypoints.thumb || !handKeypoints.index || !handKeypoints.ring) {
          return;
        }

        // Draw line from index (blue) to thumbTip (orange)
        if (handKeypoints.index && handKeypoints.thumbTip) {
          ctx.strokeStyle = '#3b82f6'; // blue
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(handKeypoints.index.x * scaleX, handKeypoints.index.y * scaleY);
          ctx.lineTo(handKeypoints.thumbTip.x * scaleX, handKeypoints.thumbTip.y * scaleY);
          ctx.stroke();
        }

        // Draw index finger dot (existing position marker)
        ctx.fillStyle = '#3b82f6'; // blue
        ctx.beginPath();
        ctx.arc(handKeypoints.index.x * scaleX, handKeypoints.index.y * scaleY, 6, 0, 2 * Math.PI);
        ctx.fill();

        // Draw THUMB_TIP dot
        if (handKeypoints.thumbTip) {
          ctx.fillStyle = '#f59e0b'; // orange
          ctx.beginPath();
          ctx.arc(handKeypoints.thumbTip.x * scaleX, handKeypoints.thumbTip.y * scaleY, 6, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Draw PINKY_TIP dot
        if (handKeypoints.pinkyTip) {
          ctx.fillStyle = '#14b8a6'; // teal
          ctx.beginPath();
          ctx.arc(handKeypoints.pinkyTip.x * scaleX, handKeypoints.pinkyTip.y * scaleY, 6, 0, 2 * Math.PI);
          ctx.fill();
        }

      }, [handTracking, handKeypoints]);

      // Calculate position percentages for display
      let xPercent, yPercent;
      if (cameraToControlScale === 1.0) {
        // Simple mapping when no buffer zone
        xPercent = ((position.x + 1) / 2) * 100;
        yPercent = ((position.y + 1) / 2) * 100;
      } else {
        // Mapping with buffer zone
        const topCutoff = cameraToControlScale * 0.5;
        const bottomCutoff = 1 - cameraToControlScale * 0.5;
        const activeRange = bottomCutoff - topCutoff;
        
        xPercent = (topCutoff + ((position.x + 1) / 2) * activeRange) * 100;
        yPercent = (topCutoff + ((position.y + 1) / 2) * activeRange) * 100;
      }

      // Circular slider handle handlers
      const handleCircleSizePointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        setIsDraggingCircleSize(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      };

      const handleCircleSizePointerMove = (e: React.PointerEvent) => {
        if (!isDraggingCircleSize || !padRef.current) return;

        const padRect = padRef.current.getBoundingClientRect();
        const centerX = padRect.left + padRect.width / 2;
        const centerY = padRect.top + padRect.height / 2;
        
        // Calculate angle from center to pointer
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        let angle = Math.atan2(dy, dx);
        
        // Convert to 0-360 degrees range
        let angleDegrees = (angle * 180 / Math.PI + 360) % 360;
        
        // Clamp to 0-360 (one full rotation only)
        angleDegrees = clampRange(angleDegrees, 0, 360);
        
        // Convert back to radians for display
        angle = angleDegrees * Math.PI / 180;
        setCircleSizeAngle(angle);
        
        // Map angle (0-360°) to circle size
        const normalizedAngle = angleDegrees / 360;
        const newSize = MIN_CIRCLE_REM + normalizedAngle * (MAX_CIRCLE_REM - MIN_CIRCLE_REM);
        
        setCircleSize(newSize);
        control.setCircleSize(newSize);
      };

      const handleCircleSizePointerEnd = (e: React.PointerEvent) => {
        if (!isDraggingCircleSize) return;
        setIsDraggingCircleSize(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      };

      // Calculate handle position on outer circle perimeter
      const handleSize = 0.75; // rem
      const outerCircleSize = MAX_CIRCLE_REM; // Fixed size for outer circle
      const outerCircleRadiusRem = outerCircleSize / 2;
      const handleX = Math.cos(circleSizeAngle) * outerCircleRadiusRem;
      const handleY = Math.sin(circleSizeAngle) * outerCircleRadiusRem;

      return (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Position Target
          </h3>

          <div className="text-[11px] text-gray-600 space-y-1">
            <div>
              Target (X,Y,Z): {position.x.toFixed(2)}, {position.y.toFixed(2)}, {((circleSize - MIN_CIRCLE_REM) / (MAX_CIRCLE_REM - MIN_CIRCLE_REM) * 2 - 1).toFixed(2)}
            </div>
            <div>
              Circle Size: {circleSize.toFixed(2)} rem
            </div>
            <div>
              θ = cos⁻¹(X) → {thetaRadians.toFixed(3)} rad ({thetaDegrees.toFixed(1)}°)
            </div>
            {handTrackedPosition && (
              <div>
                HandTracked (X,Y,Z): {handTrackedPosition.x.toFixed(2)}, {handTrackedPosition.y.toFixed(2)}, {handTrackedPosition.z.toFixed(2)}
              </div>
            )}
          </div>

          <button
            type="button"
            className="self-start rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={toggleHandTracking}
            disabled={cameraButtonDisabled}
          >
            {cameraButtonText}
          </button>

          <div className="flex flex-col items-stretch gap-4">
            {/* Pad Area with Settings Button and IK Viz */}
            <div className="flex gap-2 items-start">
              {/* Main Pad */}
              <div className="relative">
              <div
                ref={padRef}
                className={`relative border border-gray-300 shadow-sm rounded overflow-hidden ${
                  handTracking ? '' : 'bg-white'
                }`}
                style={{
                  width: '220px',
                  height: '220px',
                  minWidth: '50px',
                  minHeight: '50px',
                  touchAction: 'none',
                }}
                onPointerDown={(e) => handlePointerDown(e, 'both')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
              >
              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                style={{ display: handTracking ? 'block' : 'none' }}
                aria-hidden="true"
              />

              {/* Canvas overlay for hand keypoints */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full pointer-events-none"
                style={{ display: handTracking ? 'block' : 'none', zIndex: 3 }}
                aria-hidden="true"
              />

              {/* Horizontal Line */}
              <div
                className="absolute left-0 w-full border-t-2 border-dashed border-blue-400 pointer-events-auto"
                style={{
                  zIndex: 1,
                  top: `${yPercent}%`,
                  transform: 'translateY(-50%)',
                }}
                onPointerDown={(e) => handlePointerDown(e, 'y')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
              />

              {/* Vertical Line */}
              <div
                className="absolute top-0 h-full border-l-2 border-dashed border-blue-400 pointer-events-auto"
                style={{
                  zIndex: 1,
                  left: `${xPercent}%`,
                  transform: 'translateX(-50%)',
                }}
                onPointerDown={(e) => handlePointerDown(e, 'x')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
              />

              {/* Outer Circle (fixed size) */}
              <div
                className="absolute rounded-full border-2 border-dashed border-gray-300 pointer-events-none"
                style={{
                  zIndex: 1,
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                  width: `${outerCircleSize}rem`,
                  height: `${outerCircleSize}rem`,
                  transform: 'translate(-50%, -50%)',
                }}
              />

              {/* Target Circle (variable size) */}
              <div
                className="absolute rounded-full border-2 border-blue-500 bg-white shadow cursor-pointer pointer-events-auto"
                style={{
                  zIndex: 2,
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                  width: `${circleSize}rem`,
                  height: `${circleSize}rem`,
                  transform: 'translate(-50%, -50%)',
                }}
                onPointerDown={(e) => handlePointerDown(e, 'both')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
              />

              {/* Circular Size Control Handle on Outer Circle */}
              <div
                className="absolute rounded-full bg-green-500 border-2 border-white shadow-lg cursor-grab active:cursor-grabbing pointer-events-auto"
                style={{
                  width: `${handleSize}rem`,
                  height: `${handleSize}rem`,
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                  transform: `translate(calc(-50% + ${handleX}rem), calc(-50% + ${handleY}rem))`,
                  zIndex: 10,
                }}
                onPointerDown={handleCircleSizePointerDown}
                onPointerMove={handleCircleSizePointerMove}
                onPointerUp={handleCircleSizePointerEnd}
                onPointerCancel={handleCircleSizePointerEnd}
              />
            </div>

              {/* Settings Button */}
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 transition-colors shadow cursor-pointer"
                style={{ zIndex: 20 }}
                title="Z-Range Settings"
              >
                <Settings size={16} />
              </button>

              {/* Settings Modal */}
              {showSettings && (
                <div className="absolute top-0 right-0 mt-12 w-50 bg-white border border-gray-300 rounded shadow-lg p-4 z-30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Z-Axis Range</h4>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-gray-700 mb-1">
                        Min Z: {zRangeMin.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min={MIN_CIRCLE_REM}
                        max={MAX_CIRCLE_REM}
                        step="0.1"
                        value={zRangeMin}
                        onChange={(e) => handleZRangeMinChange(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-1">
                        Max Z: {zRangeMax.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min={MIN_CIRCLE_REM}
                        max={MAX_CIRCLE_REM}
                        step="0.1"
                        value={zRangeMax}
                        onChange={(e) => handleZRangeMaxChange(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    
                    <button
                      onClick={handleResetZRange}
                      className="w-full mt-2 px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                    >
                      Reset to Default
                    </button>
                    
                    <div className="text-[10px] text-gray-500 mt-2 pt-2 border-t">
                      Configure the Z-axis range that maps to robot arm movement.
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* IK Visualization */}
              <IKVisualization
                positionY={-position.y}
                circleSize={circleSize}
                zRangeMin={zRangeMin}
                zRangeMax={zRangeMax}
                calculateIK={inverseKinematics2Link}
              />
            </div>

            {/* Sliders */}
            <style>{`
              .custom-range {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 6px;
                border-radius: 2px;
                outline: none;
              }
              .custom-range::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 2px;
                background: #3b82f6;
                cursor: pointer;
                border: 1px solid #ffffff;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
              }
              .custom-range::-moz-range-thumb {
                width: 14px;
                height: 14px;
                border-radius: 2px;
                background: #3b82f6;
                cursor: pointer;
                border: 1px solid #ffffff;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
              }
            `}</style>
            <div className="flex flex-col items-stretch gap-2 w-full max-w-[160px]">
              {/* Gripper Angle Slider */}
              <div className="flex flex-col items-stretch gap-1">
                <span className="text-[10px] font-medium text-gray-600 text-left">
                  Gripper Angle: {gripperAngle}°
                </span>
                <input
                  type="range"
                  min={MIN_GRIPPER_DEGREES}
                  max={MAX_GRIPPER_DEGREES}
                  step={GRIPPER_STEP_DEGREES}
                  value={gripperAngle}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setGripperAngle(value);
                    control.setGripperAngle(value);
                  }}
                  className="custom-range"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((gripperAngle - MIN_GRIPPER_DEGREES) / (MAX_GRIPPER_DEGREES - MIN_GRIPPER_DEGREES)) * 100}%, #e5e7eb ${((gripperAngle - MIN_GRIPPER_DEGREES) / (MAX_GRIPPER_DEGREES - MIN_GRIPPER_DEGREES)) * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>

              {/* Gripper Mouth Angle Slider */}
              <div className="flex flex-col items-stretch gap-1">
                <span className="text-[10px] font-medium text-gray-600 text-left">
                  Gripper Mouth: {gripperMouthAngle}°
                </span>
                <input
                  type="range"
                  min={MIN_GRIPPER_MOUTH_DEGREES}
                  max={MAX_GRIPPER_MOUTH_DEGREES}
                  step={GRIPPER_MOUTH_STEP_DEGREES}
                  value={gripperMouthAngle}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setGripperMouthAngle(value);
                    control.setGripperMouthAngle(value);
                  }}
                  className="custom-range"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((gripperMouthAngle - MIN_GRIPPER_MOUTH_DEGREES) / (MAX_GRIPPER_MOUTH_DEGREES - MIN_GRIPPER_MOUTH_DEGREES)) * 100}%, #e5e7eb ${((gripperMouthAngle - MIN_GRIPPER_MOUTH_DEGREES) / (MAX_GRIPPER_MOUTH_DEGREES - MIN_GRIPPER_MOUTH_DEGREES)) * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>

              {/* Wrist Flex Slider */}
              <div className="flex flex-col items-stretch gap-1">
                <span className="text-[10px] font-medium text-gray-600 text-left">
                  Wrist Flex: {wristFlexAngle}°
                </span>
                <input
                  type="range"
                  min={MIN_WRIST_FLEX_DEGREES}
                  max={MAX_WRIST_FLEX_DEGREES}
                  step={WRIST_FLEX_STEP_DEGREES}
                  value={wristFlexAngle}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setWristFlexAngle(value);
                    control.setWristFlexAngle(value);
                  }}
                  className="custom-range"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((wristFlexAngle - MIN_WRIST_FLEX_DEGREES) / (MAX_WRIST_FLEX_DEGREES - MIN_WRIST_FLEX_DEGREES)) * 100}%, #e5e7eb ${((wristFlexAngle - MIN_WRIST_FLEX_DEGREES) / (MAX_WRIST_FLEX_DEGREES - MIN_WRIST_FLEX_DEGREES)) * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      );
    };
  }
}
