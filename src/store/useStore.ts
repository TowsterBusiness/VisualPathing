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
  FieldPosition,
  Heading,
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
        controlPoints: [],
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

    // Prevent cycles: check if target can already reach source through existing edges
    // If target can reach source, then adding source->target would create a cycle
    const wouldCreateCycle = (source: string, target: string, edges: AppEdge[]): boolean => {
      const visited = new Set<string>();
      const queue: string[] = [target];
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current === source) return true; // Found a path from target to source
        if (visited.has(current)) continue;
        visited.add(current);
        
        // Add all nodes that current points to
        for (const edge of edges) {
          if (edge.source === current) {
            queue.push(edge.target);
          }
        }
      }
      return false;
    };

    if (wouldCreateCycle(connection.source, connection.target, edges)) {
      console.warn('Cannot create connection: would create a cycle');
      return; // Reject connection that would create a cycle
    }

    // Remove any existing edges that conflict with this connection (enforce 1-to-1 handles)
    const filteredEdges = edges.filter(
      (e) =>
        // Keep edge if it's not on the same target handle
        !(e.target === connection.target &&
          (e.targetHandle ?? null) === (connection.targetHandle ?? null)) &&
        // Keep edge if it's not on the same source handle
        !(e.source === connection.source &&
          (e.sourceHandle ?? null) === (connection.sourceHandle ?? null))
    );

    set({ edges: addEdge(connection, filteredEdges) });
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
    const updatedNodes = get().nodes.map((node) => {
      if (node.id !== id) return node;
      return {
        ...node,
        data: { ...node.data, ...newData } as LogicNodeData & Record<string, unknown>,
      };
    });

    // Check if this update affects the node's end position
    const updatedNode = updatedNodes.find((n) => n.id === id);
    if (!updatedNode) {
      set({ nodes: updatedNodes });
      return;
    }

    const updatedData = updatedNode.data as LogicNodeData;
    let endPositionChanged = false;
    let newEndPosition: FieldPosition | null = null;
    let newEndHeading: Heading | null = null;

    // Determine if end position changed
    if (updatedData.type === 'start' && 'position' in newData) {
      endPositionChanged = true;
      newEndPosition = (updatedData as StartNodeData).position;
      if ('heading' in newData) {
        newEndHeading = (updatedData as StartNodeData).heading;
      }
    } else if (updatedData.type === 'move' && 'targetPosition' in newData) {
      endPositionChanged = true;
      newEndPosition = (updatedData as MoveNodeData).targetPosition;
      if ('targetHeading' in newData) {
        newEndHeading = (updatedData as MoveNodeData).targetHeading;
      }
    }

    // If end position changed, update downstream nodes with ambiguousStart
    if (endPositionChanged && newEndPosition) {
      const edges = get().edges;
      const childNodes = edges
        .filter((e) => e.source === id)
        .map((e) => e.target);

      const finalNodes = updatedNodes.map((node) => {
        if (!childNodes.includes(node.id)) return node;

        const nodeData = node.data as LogicNodeData;
        if (nodeData.type === 'move') {
          const moveData = nodeData as MoveNodeData;
          // Update override position if ambiguousStart is true
          if (moveData.ambiguousStart) {
            const updatedMoveData: Partial<MoveNodeData> = {
              overrideStartPosition: newEndPosition,
            };
            if (newEndHeading !== null) {
              updatedMoveData.overrideStartHeading = newEndHeading;
            }
            return {
              ...node,
              data: { ...node.data, ...updatedMoveData } as LogicNodeData & Record<string, unknown>,
            };
          }
        }
        return node;
      });

      set({ nodes: finalNodes });
    } else {
      set({ nodes: updatedNodes });
    }
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
