import type { FieldPosition } from '../types/nodes';

/**
 * Binomial coefficient calculation for Bezier curves
 */
function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result *= (n - i + 1) / i;
  }
  return result;
}

/**
 * Evaluate a general Bezier curve at parameter t with any number of control points.
 * For n control points, this is an (n-1)-degree Bezier curve.
 * 
 * @param points - All points including start, control points, and end
 * @param t - Parameter from 0 to 1
 */
export function generalBezier(points: FieldPosition[], t: number): FieldPosition {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  
  const n = points.length - 1;
  let x = 0;
  let y = 0;
  
  for (let i = 0; i <= n; i++) {
    const coefficient = binomial(n, i) * Math.pow(1 - t, n - i) * Math.pow(t, i);
    x += coefficient * points[i].x;
    y += coefficient * points[i].y;
  }
  
  return { x, y };
}

/**
 * Evaluate a cubic bezier at parameter t (kept for backwards compatibility)
 */
export function cubicBezier(
  p0: FieldPosition,
  p1: FieldPosition,
  p2: FieldPosition,
  p3: FieldPosition,
  t: number,
): FieldPosition {
  return generalBezier([p0, p1, p2, p3], t);
}

/**
 * Sample points along a general Bezier curve
 * 
 * @param points - All points including start, control points, and end
 * @param samples - Number of samples to take along the curve
 */
export function sampleBezierPath(
  points: FieldPosition[],
  samples = 50,
): FieldPosition[] {
  const result: FieldPosition[] = [];
  for (let i = 0; i <= samples; i++) {
    result.push(generalBezier(points, i / samples));
  }
  return result;
}
