import type { DefaultPivotValues } from './types';

export const FALLBACK_PIVOT_VALUES: DefaultPivotValues = {
  shoulder_pan: 0.0,
  shoulder_lift: 35.0,
  elbow_flex: -25.0,
  wrist_flex: 86.0,
  wrist_roll: 59.0,
  gripper: 67.0,
};

export function resolveDefaultPivotValues(override?: DefaultPivotValues): DefaultPivotValues {
  if (!override) {
    return { ...FALLBACK_PIVOT_VALUES };
  }

  const resolved: DefaultPivotValues = { ...override };
  (Object.keys(FALLBACK_PIVOT_VALUES) as Array<keyof DefaultPivotValues>).forEach((key) => {
    if (resolved[key] === undefined) {
      resolved[key] = FALLBACK_PIVOT_VALUES[key];
    }
  });
  return resolved;
}
