import type { FieldPosition } from '../types/nodes';

/**
 * Evaluate a cubic bezier at parameter t
 */
export function cubicBezier(
  p0: FieldPosition,
  p1: FieldPosition,
  p2: FieldPosition,
  p3: FieldPosition,
  t: number,
): FieldPosition {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

/**
 * Sample points along a cubic bezier curve
 */
export function sampleBezierPath(
  start: FieldPosition,
  cp1: FieldPosition,
  cp2: FieldPosition,
  end: FieldPosition,
  samples = 50,
): FieldPosition[] {
  const points: FieldPosition[] = [];
  for (let i = 0; i <= samples; i++) {
    points.push(cubicBezier(start, cp1, cp2, end, i / samples));
  }
  return points;
}
