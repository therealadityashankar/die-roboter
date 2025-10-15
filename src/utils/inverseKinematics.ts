/**
 * Inverse kinematics for a 2-link planar robot arm
 * @param x Target X coordinate
 * @param y Target Y coordinate
 * @param L1 Length of first link
 * @param L2 Length of second link
 * @returns Object with theta1 and theta2 in radians, or null if unreachable
 */
export function inverseKinematics2Link(
  x: number,
  y: number,
  L1: number,
  L2: number
): { theta1: number; theta2: number } | null {
  const distance = Math.sqrt(x * x + y * y);
  
  // Check if target is reachable
  if (distance > L1 + L2 || distance < Math.abs(L1 - L2)) {
    return null; // Target is unreachable
  }
  
  // Calculate theta2 using law of cosines
  const cosTheta2 = (distance * distance - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  let theta2 = Math.acos(Math.max(-1, Math.min(1, cosTheta2))); // Clamp to [-1, 1]
  theta2 = 2*Math.PI - theta2;
  
  // Calculate theta1
  const k1 = L1 + L2 * Math.cos(theta2);
  const k2 = L2 * Math.sin(theta2);
  const theta1 = Math.atan2(y, x) - Math.atan2(k2, k1);

  // normalize theta1 and theta2 to be between 0 and 2PI
  const theta1Normalized = theta1 % (2 * Math.PI);
  const theta2Normalized = theta2 % (2 * Math.PI);
  
  return { theta1: theta1Normalized, theta2 : theta2Normalized };
}
