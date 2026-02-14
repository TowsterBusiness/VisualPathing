import type { FieldPosition, Heading, LogicNodeData, MoveNodeData, StartNodeData } from '../types/nodes';
import type { RobotSettings, TimelineSegment, TimePrediction, RobotState } from '../types/simulation';
import { cubicBezier } from './bezier';
import type { AppNode, AppEdge } from '../store/useStore';

// ─── Curve Utilities ────────────────────────────────────────────

/**
 * Calculate the arc length of a cubic bézier by sampling.
 */
export function calculateCurveLength(
  start: FieldPosition,
  cp1: FieldPosition,
  cp2: FieldPosition,
  end: FieldPosition,
  samples = 100,
): number {
  let length = 0;
  let prev = start;

  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const pt = cubicBezier(start, cp1, cp2, end, t);
    const dx = pt.x - prev.x;
    const dy = pt.y - prev.y;
    length += Math.sqrt(dx * dx + dy * dy);
    prev = pt;
  }

  return length;
}

/**
 * Calculate the tangent angle (degrees) at a point on a cubic bézier.
 */
export function getHeadingAtT(
  start: FieldPosition,
  cp1: FieldPosition,
  cp2: FieldPosition,
  end: FieldPosition,
  t: number,
): Heading {
  const dt = 0.001;
  const t0 = Math.max(0, t - dt);
  const t1 = Math.min(1, t + dt);
  const p0 = cubicBezier(start, cp1, cp2, end, t0);
  const p1 = cubicBezier(start, cp1, cp2, end, t1);
  return Math.atan2(p1.y - p0.y, p1.x - p0.x) * (180 / Math.PI);
}

// ─── Motion Profile ─────────────────────────────────────────────

/**
 * Trapezoidal / triangular motion profile time calculator.
 * Returns time in seconds to travel `distance` inches.
 */
export function calculateMotionProfileTime(
  distance: number,
  maxVel: number,
  maxAcc: number,
  maxDec?: number,
): number {
  if (distance <= 0) return 0;
  const decel = maxDec ?? maxAcc;

  // Distance needed to accelerate to maxVel and decelerate from it
  const accDist = (maxVel * maxVel) / (2 * maxAcc);
  const decDist = (maxVel * maxVel) / (2 * decel);

  if (distance >= accDist + decDist) {
    // Trapezoidal profile: accel → cruise → decel
    const accTime = maxVel / maxAcc;
    const decTime = maxVel / decel;
    const cruiseDist = distance - accDist - decDist;
    const cruiseTime = cruiseDist / maxVel;
    return accTime + cruiseTime + decTime;
  } else {
    // Triangular profile: accel → decel (never reaches maxVel)
    const vPeak = Math.sqrt(
      (2 * distance * maxAcc * decel) / (maxAcc + decel),
    );
    return (vPeak / maxAcc) + (vPeak / decel);
  }
}

/**
 * Time to rotate through `angleDeg` degrees at given angular velocity.
 */
export function calculateRotationTime(angleDeg: number, angularVelocity: number): number {
  if (angleDeg <= 0) return 0;
  const angleRad = angleDeg * (Math.PI / 180);
  return angleRad / angularVelocity;
}

// ─── Angular Helpers ────────────────────────────────────────────

/** Shortest signed angular difference from a to b (degrees, -180..180) */
export function angularDifference(from: Heading, to: Heading): number {
  let diff = ((to - from) % 360 + 540) % 360 - 180;
  return diff;
}

/** Unsigned angular distance */
export function absAngularDifference(from: Heading, to: Heading): number {
  return Math.abs(angularDifference(from, to));
}

// ─── Tree Traversal ─────────────────────────────────────────────

interface ResolvedChain {
  nodeId: string;
  data: LogicNodeData;
}

/**
 * Walk the node graph starting from the start node, following edges
 * in order and producing a linear chain of nodes to visit.
 * Only follows the "main" execution path (first source handle).
 */
function buildExecutionChain(
  nodes: AppNode[],
  edges: AppEdge[],
): ResolvedChain[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build source→target adjacency (source,sourceHandle) → target
  const sourceToTarget = new Map<string, string>();
  for (const edge of edges) {
    const key = edge.sourceHandle
      ? `${edge.source}::${edge.sourceHandle}`
      : edge.source;
    sourceToTarget.set(key, edge.target);
  }

  // Find the start node
  const startNode = nodes.find((n) => (n.data as LogicNodeData).type === 'start');
  if (!startNode) return [];

  const chain: ResolvedChain[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined = startNode.id;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = nodeMap.get(currentId);
    if (!node) break;

    chain.push({ nodeId: currentId, data: node.data as LogicNodeData });

    // Follow the default output — try without handle first, then with handle
    let next = sourceToTarget.get(currentId);
    if (!next) {
      // Try source handles (e.g., for split: "true"/"false", while: "body"/"next")
      for (const [key, target] of sourceToTarget.entries()) {
        if (key.startsWith(`${currentId}::`)) {
          next = target;
          break; // take first branch
        }
      }
    }
    currentId = next;
  }

  return chain;
}

// ─── Main Calculator ────────────────────────────────────────────

/**
 * Calculate the full time prediction for the node graph.
 */
export function calculatePathTime(
  nodes: AppNode[],
  edges: AppEdge[],
  settings: RobotSettings,
): TimePrediction {
  const chain = buildExecutionChain(nodes, edges);
  if (chain.length === 0) {
    return { totalTime: 0, totalDistance: 0, segments: [] };
  }

  const segments: TimelineSegment[] = [];
  let currentTime = 0;
  let totalDistance = 0;

  // Initialise from start node
  let currentPos: FieldPosition = { x: 72, y: 72 };
  let currentHeading: Heading = 0;

  for (const { nodeId, data } of chain) {
    switch (data.type) {
      case 'start': {
        const sd = data as StartNodeData;
        currentPos = sd.position;
        currentHeading = sd.heading;
        // Start node itself takes no time, but record it as a 0-length segment
        segments.push({
          kind: 'wait',
          nodeId,
          duration: 0,
          startTime: currentTime,
          endTime: currentTime,
          startPosition: { ...currentPos },
          endPosition: { ...currentPos },
          startHeading: currentHeading,
          endHeading: currentHeading,
        });
        break;
      }

      case 'move': {
        const md = data as MoveNodeData;

        // Determine start position for this move
        let startPos = currentPos;
        if (md.ambiguousStart && md.overrideStartPosition) {
          startPos = md.overrideStartPosition;
        }

        const endPos = md.targetPosition;
        const cp1: FieldPosition = {
          x: startPos.x + md.controlPoint1.x,
          y: startPos.y + md.controlPoint1.y,
        };
        const cp2: FieldPosition = {
          x: endPos.x + md.controlPoint2.x,
          y: endPos.y + md.controlPoint2.y,
        };

        // --- Rotation to face path direction ---
        const pathStartHeading = getHeadingAtT(startPos, cp1, cp2, endPos, 0);
        const rotAngle = absAngularDifference(currentHeading, pathStartHeading);

        if (rotAngle > 0.5) {
          const rotTime = calculateRotationTime(rotAngle, settings.angularVelocity);
          segments.push({
            kind: 'rotate',
            nodeId,
            duration: rotTime,
            startTime: currentTime,
            endTime: currentTime + rotTime,
            startPosition: { ...startPos },
            endPosition: { ...startPos },
            startHeading: currentHeading,
            endHeading: pathStartHeading,
          });
          currentTime += rotTime;
          currentHeading = pathStartHeading;
        }

        // --- Travel along the bezier ---
        const curveLen = calculateCurveLength(startPos, cp1, cp2, endPos);
        totalDistance += curveLen;

        const travelTime = calculateMotionProfileTime(
          curveLen,
          settings.maxVelocity,
          settings.maxAcceleration,
          settings.maxDeceleration,
        );

        const bezierPoints: [FieldPosition, FieldPosition, FieldPosition, FieldPosition] =
          [startPos, cp1, cp2, endPos];

        segments.push({
          kind: 'travel',
          nodeId,
          duration: travelTime,
          startTime: currentTime,
          endTime: currentTime + travelTime,
          startPosition: { ...startPos },
          endPosition: { ...endPos },
          startHeading: currentHeading,
          endHeading: md.targetHeading,
          bezierPoints,
        });

        currentTime += travelTime;
        currentPos = endPos;
        currentHeading = md.targetHeading;
        break;
      }

      case 'wait': {
        // Wait nodes represent a condition wait — estimate ~1s placeholder
        const waitDuration = 1.0;
        segments.push({
          kind: 'wait',
          nodeId,
          duration: waitDuration,
          startTime: currentTime,
          endTime: currentTime + waitDuration,
          startPosition: { ...currentPos },
          endPosition: { ...currentPos },
          startHeading: currentHeading,
          endHeading: currentHeading,
        });
        currentTime += waitDuration;
        break;
      }

      case 'action': {
        // Action nodes execute a function — estimate ~0.5s placeholder
        const actionDuration = 0.5;
        segments.push({
          kind: 'action',
          nodeId,
          duration: actionDuration,
          startTime: currentTime,
          endTime: currentTime + actionDuration,
          startPosition: { ...currentPos },
          endPosition: { ...currentPos },
          startHeading: currentHeading,
          endHeading: currentHeading,
        });
        currentTime += actionDuration;
        break;
      }

      // Parallel, split, merge, while — structural nodes, pass through
      default:
        break;
    }
  }

  return {
    totalTime: currentTime,
    totalDistance,
    segments,
  };
}

// ─── Interpolation ──────────────────────────────────────────────

/**
 * Interpolate the heading between two values using shortest arc.
 */
function lerpHeading(from: Heading, to: Heading, t: number): Heading {
  const diff = angularDifference(from, to);
  return from + diff * t;
}

/**
 * Given the current animation time, compute the robot's position & heading.
 */
export function getRobotStateAtTime(
  prediction: TimePrediction,
  time: number,
): RobotState {
  if (prediction.segments.length === 0) {
    return {
      position: { x: 72, y: 72 },
      heading: 0,
      activeSegmentIndex: -1,
      activeNodeId: null,
      progress: 0,
    };
  }

  const totalTime = prediction.totalTime;
  const clampedTime = Math.max(0, Math.min(time, totalTime));
  const progress = totalTime > 0 ? clampedTime / totalTime : 0;

  // Find the active segment
  for (let i = 0; i < prediction.segments.length; i++) {
    const seg = prediction.segments[i];
    if (clampedTime >= seg.startTime && clampedTime <= seg.endTime) {
      const segProgress = seg.duration > 0
        ? (clampedTime - seg.startTime) / seg.duration
        : 1;

      let position: FieldPosition;
      let heading: Heading;

      if (seg.kind === 'travel' && seg.bezierPoints) {
        // Interpolate along bézier
        const [p0, p1, p2, p3] = seg.bezierPoints;
        position = cubicBezier(p0, p1, p2, p3, segProgress);
        heading = lerpHeading(seg.startHeading, seg.endHeading, segProgress);
      } else if (seg.kind === 'rotate') {
        position = { ...seg.startPosition };
        heading = lerpHeading(seg.startHeading, seg.endHeading, segProgress);
      } else {
        // wait / action — stationary
        position = { ...seg.startPosition };
        heading = seg.startHeading;
      }

      return {
        position,
        heading,
        activeSegmentIndex: i,
        activeNodeId: seg.nodeId,
        progress,
      };
    }
  }

  // Past end — return final state
  const last = prediction.segments[prediction.segments.length - 1];
  return {
    position: { ...last.endPosition },
    heading: last.endHeading,
    activeSegmentIndex: prediction.segments.length - 1,
    activeNodeId: last.nodeId,
    progress: 1,
  };
}

// ─── Formatting Helpers ─────────────────────────────────────────

/** Format seconds into a human-readable string */
export function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0.0s';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}s`;
  }
  return `${seconds.toFixed(1)}s`;
}
