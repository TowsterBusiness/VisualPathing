import { create } from 'zustand';
import {
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Connection,
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import type {
  LogicNodeData,
  StartNodeData,
  MoveNodeData,
  ParallelNodeData,
  SplitNodeData,
  MergeNodeData,
  WhileNodeData,
  WaitNodeData,
  ActionNodeData,
  ExportedTree,
  LogicNodeType,
} from '../types/nodes';

export type AppNode = Node<LogicNodeData & Record<string, unknown>>;
export type AppEdge = Edge;

interface AppState {
  // React Flow state
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Selection
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  // Project
  projectName: string;
  setProjectName: (name: string) => void;

  // Field background image
  fieldImageUrl: string | null;
  setFieldImageUrl: (url: string | null) => void;

  // Node CRUD
  addNode: (type: LogicNodeType, editorPosition?: { x: number; y: number }) => string;
  updateNodeData: (id: string, data: Partial<LogicNodeData>) => void;
  deleteNode: (id: string) => void;

  // Get node helpers
  getNode: (id: string) => AppNode | undefined;
  getParentNode: (id: string) => AppNode | undefined;

  // Export
  exportToJson: () => ExportedTree;
  importFromJson: (tree: ExportedTree) => void;
}

function defaultDataForType(type: LogicNodeType): LogicNodeData {
  switch (type) {
    case 'start':
      return {
        type: 'start',
        label: 'Start',
        position: { x: 72, y: 72 },
        heading: 0,
      } satisfies StartNodeData;
    case 'move':
      return {
        type: 'move',
        label: 'Move To',
        targetPosition: { x: 72, y: 72 },
        targetHeading: 0,
        controlPoint1: { x: 10, y: 0 },
        controlPoint2: { x: -10, y: 0 },
        ambiguousStart: false,
      } satisfies MoveNodeData;
    case 'parallel':
      return {
        type: 'parallel',
        label: 'Parallel',
        branchCount: 2,
      } satisfies ParallelNodeData;
    case 'while':
      return {
        type: 'while',
        label: 'While',
        conditionFunctionName: 'myCondition',
        runMode: 'every_loop',
      } satisfies WhileNodeData;
    case 'wait':
      return {
        type: 'wait',
        label: 'Wait Until',
        conditionFunctionName: 'myCondition',
      } satisfies WaitNodeData;
    case 'action':
      return {
        type: 'action',
        label: 'Run Action',
        functionName: 'myAction',
        runMode: 'once',
      } satisfies ActionNodeData;
    case 'split':
      return {
        type: 'split',
        label: 'If / Split',
        conditionFunctionName: 'myCondition',
      } satisfies SplitNodeData;
    case 'merge':
      return {
        type: 'merge',
        label: 'Merge',
      } satisfies MergeNodeData;
    default:
      return {
        type: 'start',
        label: 'Start',
        position: { x: 72, y: 72 },
        heading: 0,
      } satisfies StartNodeData;
  }
}

const initialStartNode: AppNode = {
  id: 'start-1',
  type: 'start',
  position: { x: 250, y: 50 },
  data: {
    type: 'start',
    label: 'Start',
    position: { x: 72, y: 72 },
    heading: 0,
  } as StartNodeData & Record<string, unknown>,
};

export const useStore = create<AppState>((set, get) => ({
  nodes: [initialStartNode],
  edges: [],
  selectedNodeId: null,
  projectName: 'My Robot Path',
  fieldImageUrl: null,

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setProjectName: (name) => set({ projectName: name }),
  setFieldImageUrl: (url) => set({ fieldImageUrl: url }),

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection: Connection) => {
    const edges = get().edges;

    // Enforce 1-to-1: reject if target handle already has an incoming edge
    const targetOccupied = edges.some(
      (e) =>
        e.target === connection.target &&
        (e.targetHandle ?? null) === (connection.targetHandle ?? null),
    );
    if (targetOccupied) return;

    // Reject if source handle already has an outgoing edge
    const sourceOccupied = edges.some(
      (e) =>
        e.source === connection.source &&
        (e.sourceHandle ?? null) === (connection.sourceHandle ?? null),
    );
    if (sourceOccupied) return;

    set({ edges: addEdge(connection, get().edges) });
  },

  addNode: (type, editorPosition) => {
    const id = `${type}-${uuidv4().slice(0, 8)}`;
    const data = defaultDataForType(type) as LogicNodeData & Record<string, unknown>;
    const pos = editorPosition ?? { x: 250, y: get().nodes.length * 120 + 50 };

    const newNode: AppNode = {
      id,
      type,
      position: pos,
      data,
    };

    set({ nodes: [...get().nodes, newNode] });
    return id;
  },

  updateNodeData: (id, newData) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== id) return node;
        return {
          ...node,
          data: { ...node.data, ...newData } as LogicNodeData & Record<string, unknown>,
        };
      }),
    });
  },

  deleteNode: (id) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
  },

  getNode: (id) => get().nodes.find((n) => n.id === id),

  getParentNode: (id) => {
    const parentEdge = get().edges.find((e) => e.target === id);
    if (!parentEdge) return undefined;
    return get().nodes.find((n) => n.id === parentEdge.source);
  },

  exportToJson: () => {
    const { nodes, edges, projectName } = get();
    return {
      version: '1.0.0',
      name: projectName,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: (n.data as LogicNodeData).type,
        data: n.data as LogicNodeData,
        position: n.position,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
      })),
    };
  },

  importFromJson: (tree) => {
    set({
      projectName: tree.name,
      nodes: tree.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data as LogicNodeData & Record<string, unknown>,
      })),
      edges: tree.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
      selectedNodeId: null,
    });
  },
}));
