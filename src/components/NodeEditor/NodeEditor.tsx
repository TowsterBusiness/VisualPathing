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
    const targetCount = new Map<string, number>();
    const targetIdx = new Map<string, number>();

    for (const edge of edges) {
      sourceCount.set(edge.source, (sourceCount.get(edge.source) ?? 0) + 1);
      // For targets, use a key that includes the handle ID so we don't offset different handles
      const targetKey = `${edge.target}-${edge.targetHandle ?? 'default'}`;
      targetCount.set(targetKey, (targetCount.get(targetKey) ?? 0) + 1);
    }

    return edges.map((edge) => {
      const sourceKey = edge.source;
      const sourceTotal = sourceCount.get(sourceKey) ?? 1;
      let sourceOffset = 0;
      
      if (sourceTotal > 1) {
        const idx = sourceIdx.get(sourceKey) ?? 0;
        sourceIdx.set(sourceKey, idx + 1);
        sourceOffset = (idx - (sourceTotal - 1) / 2) * 20;
      }

      const targetKey = `${edge.target}-${edge.targetHandle ?? 'default'}`;
      const targetTotal = targetCount.get(targetKey) ?? 1;
      let targetOffset = 0;
      
      if (targetTotal > 1) {
        const idx = targetIdx.get(targetKey) ?? 0;
        targetIdx.set(targetKey, idx + 1);
        targetOffset = (idx - (targetTotal - 1) / 2) * 20;
      }

      const totalOffset = sourceOffset + targetOffset;
      if (totalOffset === 0) return edge;

      return {
        ...edge,
        data: { ...edge.data, pathOptions: { offset: totalOffset } },
      };
    });
  }, [edges]);

  /* Allow all connections - conflicting edges will be auto-removed */
  const isValidConnection: IsValidConnection = () => true;

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
