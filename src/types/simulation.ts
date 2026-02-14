import type { FieldPosition, Heading } from './nodes';

/** Robot motion settings for time estimation */
export interface RobotSettings {
  /** Max translational velocity (inches/sec) */
  maxVelocity: number;
  /** Max translational acceleration (inches/sec²) */
  maxAcceleration: number;
  /** Max translational deceleration (inches/sec²). Falls back to maxAcceleration if unset. */
  maxDeceleration?: number;
  /** Max angular velocity (radians/sec) */
  angularVelocity: number;
}

/** Default FTC robot settings (reasonable Pedro Pathing defaults) */
export const DEFAULT_ROBOT_SETTINGS: RobotSettings = {
  maxVelocity: 50,        // ~50 in/s is a solid FTC drivetrain
  maxAcceleration: 40,
  maxDeceleration: 40,
  angularVelocity: Math.PI, // ~180°/s
};

/** A single segment in the timeline */
export interface TimelineSegment {
  kind: 'travel' | 'rotate' | 'wait' | 'action';
  /** Node ID this segment belongs to */
  nodeId: string;
  /** Duration in seconds */
  duration: number;
  /** Absolute start time (seconds) */
  startTime: number;
  /** Absolute end time (seconds) */
  endTime: number;
  /** Position at segment start */
  startPosition: FieldPosition;
  /** Position at segment end */
  endPosition: FieldPosition;
  /** Heading at segment start (degrees) */
  startHeading: Heading;
  /** Heading at segment end (degrees) */
  endHeading: Heading;
  /**
   * For 'travel' segments: the bezier curve for interpolation.
   * [start, cp1, cp2, end]
   */
  bezierPoints?: [FieldPosition, FieldPosition, FieldPosition, FieldPosition];
}

/** Full time prediction result */
export interface TimePrediction {
  totalTime: number;
  totalDistance: number;
  segments: TimelineSegment[];
}

/** The robot's interpolated state at a point in time */
export interface RobotState {
  position: FieldPosition;
  heading: Heading;
  /** Which segment index is active (-1 if finished) */
  activeSegmentIndex: number;
  /** Which node is active */
  activeNodeId: string | null;
  /** Progress through the entire path 0..1 */
  progress: number;
}
