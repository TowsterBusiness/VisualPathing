import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type IsValidConnection,
  type EdgeTypes,
  SmoothStepEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { StartNode } from '../nodes/StartNode';
import { MoveNode } from '../nodes/MoveNode';
import { ParallelNode } from '../nodes/ParallelNode';
import { SplitNode } from '../nodes/SplitNode';
import { MergeNode } from '../nodes/MergeNode';
import { WhileNode } from '../nodes/WhileNode';
import { WaitNode } from '../nodes/WaitNode';
import { ActionNode } from '../nodes/ActionNode';
import './NodeEditor.css';

const nodeTypes: NodeTypes = {
  start: StartNode,
  move: MoveNode,
  parallel: ParallelNode,
  split: SplitNode,
  merge: MergeNode,
  while: WhileNode,
  wait: WaitNode,
  action: ActionNode,
};

const edgeTypes: EdgeTypes = {
  smoothstep: SmoothStepEdge,
};

export function NodeEditor() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const onConnect = useStore((s) => s.onConnect);
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);

  /* Compute edges with offsets to avoid overlapping paths */
  const edgesWithOffsets = useMemo(() => {
    // Group edges that share the same source or target node
    const sourceCount = new Map<string, number>();
    const sourceIdx = new Map<string, number>();

    for (const edge of edges) {
      const key = edge.source;
      sourceCount.set(key, (sourceCount.get(key) ?? 0) + 1);
    }

    return edges.map((edge) => {
      const key = edge.source;
      const total = sourceCount.get(key) ?? 1;
      if (total <= 1) return edge;

      const idx = sourceIdx.get(key) ?? 0;
      sourceIdx.set(key, idx + 1);
      const offset = (idx - (total - 1) / 2) * 20;

      return {
        ...edge,
        data: { ...edge.data, pathOptions: { offset } },
      };
    });
  }, [edges]);

  /* Prevent connecting to an already-occupied handle (visual feedback) */
  const isValidConnection: IsValidConnection = (connection) => {
    const targetOccupied = edges.some(
      (e) =>
        e.target === connection.target &&
        (e.targetHandle ?? null) === (connection.targetHandle ?? null),
    );
    if (targetOccupied) return false;

    const sourceOccupied = edges.some(
      (e) =>
        e.source === connection.source &&
        (e.sourceHandle ?? null) === (connection.sourceHandle ?? null),
    );
    if (sourceOccupied) return false;

    return true;
  };

  return (
    <div className="node-editor-container">
      <ReactFlow
        nodes={nodes}
        edges={edgesWithOffsets}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        fitView
        className="node-editor-flow"
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#585b70', strokeWidth: 2 },
          animated: true,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#313244" gap={20} size={1} />
        <Controls className="flow-controls" />
        <MiniMap
          className="flow-minimap"
          nodeColor={(n) => {
            switch (n.type) {
              case 'start': return '#a6e3a1';
              case 'move': return '#89b4fa';
              case 'parallel': return '#f9e2af';
              case 'split': return '#f38ba8';
              case 'merge': return '#94e2d5';
              case 'while': return '#cba6f7';
              case 'wait': return '#fab387';
              case 'action': return '#74c7ec';
              default: return '#585b70';
            }
          }}
          maskColor="rgba(17, 17, 27, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
