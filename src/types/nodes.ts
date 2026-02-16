/** Coordinate on the FTC field (inches, 0-144) */
export interface FieldPosition {
  x: number;
  y: number;
}

/** A bezier control point for path curves */
export interface BezierPoint {
  x: number;
  y: number;
}

/** Heading in degrees */
export type Heading = number;

/**
 * All node types in the logic tree
 */
export type LogicNodeType =
  | 'start'
  | 'move'
  | 'parallel'
  | 'split'
  | 'merge'
  | 'while'
  | 'wait'
  | 'action'
  | 'condition';

/**
 * Base data shared by all logic nodes
 */
export interface BaseNodeData {
  label: string;
  type: LogicNodeType;
}

/**
 * Start node — the entry point. Sets the robot's initial position.
 */
export interface StartNodeData extends BaseNodeData {
  type: 'start';
  position: FieldPosition;
  heading: Heading;
}

/**
 * Move node — drives the robot along a bezier path to a target position.
 * The start position is derived from the preceding node in the tree.
 */
export interface MoveNodeData extends BaseNodeData {
  type: 'move';
  targetPosition: FieldPosition;
  targetHeading: Heading;
  /** Control points for the path (can be 0 to many). Each point is relative to its nearest anchor (start or end). */
  controlPoints: BezierPoint[];
  /** Whether the starting position is ambiguous (user-set, not derived) */
  ambiguousStart: boolean;
  /** If ambiguousStart, user provides explicit start */
  overrideStartPosition?: FieldPosition;
  overrideStartHeading?: Heading;
}

/**
 * Parallel node — runs multiple child branches simultaneously.
 * Children connect from its output handles.
 */
export interface ParallelNodeData extends BaseNodeData {
  type: 'parallel';
  /** Number of parallel branches */
  branchCount: number;
}

/**
 * While node — repeats its children while a condition function returns true.
 */
export interface WhileNodeData extends BaseNodeData {
  type: 'while';
  /** Name of the condition function (returns boolean) */
  conditionFunctionName: string;
  /** Whether the body runs every loop or just the first iteration */
  runMode: 'every_loop' | 'once';
}

/**
 * Wait node — blocks until a condition function returns true.
 */
export interface WaitNodeData extends BaseNodeData {
  type: 'wait';
  /** Name of the condition function (returns boolean) */
  conditionFunctionName: string;
}

/**
 * Action node — executes a function once.
 */
export interface ActionNodeData extends BaseNodeData {
  type: 'action';
  /** Name of the function to execute */
  functionName: string;
  /** Whether this runs every loop or just once */
  runMode: 'every_loop' | 'once';
}

/**
 * Split node — an if/else branch node. Splits execution into a "true" branch
 * and a "false" branch based on a condition function.
 * Both branches must reach the same field position before merging.
 */
export interface SplitNodeData extends BaseNodeData {
  type: 'split';
  /** Name of the condition function (returns boolean) */
  conditionFunctionName: string;
}

/**
 * Merge node — joins multiple branches back together.
 * All parent branches must resolve to the same field position.
 */
export interface MergeNodeData extends BaseNodeData {
  type: 'merge';
}

/**
 * Union of all node data types
 */
export type LogicNodeData =
  | StartNodeData
  | MoveNodeData
  | ParallelNodeData
  | SplitNodeData
  | MergeNodeData
  | WhileNodeData
  | WaitNodeData
  | ActionNodeData;

/**
 * Exported JSON structure
 */
export interface ExportedTree {
  version: string;
  name: string;
  nodes: ExportedNode[];
  edges: ExportedEdge[];
}

export interface ExportedNode {
  id: string;
  type: LogicNodeType;
  data: LogicNodeData;
  position: { x: number; y: number }; // position in the editor canvas
}

export interface ExportedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}
