import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ParallelNodeData } from '../../types/nodes';
import { useStore } from '../../store/useStore';
import './NodeStyles.css';

export function ParallelNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ParallelNodeData;
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);

  const branchHandles = Array.from({ length: nodeData.branchCount }, (_, i) => {
    const pct = ((i + 1) / (nodeData.branchCount + 1)) * 100;
    return (
      <Handle
        key={`branch-${i}`}
        type="source"
        position={Position.Bottom}
        id={`branch-${i}`}
        className="handle-source"
        style={{ left: `${pct}%` }}
      />
    );
  });

  return (
    <div
      className={`logic-node parallel-node ${selected ? 'selected' : ''}`}
      onClick={() => setSelectedNodeId(id)}
    >
      <Handle type="target" position={Position.Top} className="handle-target" />
      <div className="node-header parallel-header">
        <span className="material-icons node-icon">call_split</span>
        <span className="node-title">{nodeData.label}</span>
        <span className="node-badge">{nodeData.branchCount}×</span>
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="field-label">Branches:</span>
          <span className="field-value">{nodeData.branchCount}</span>
        </div>
      </div>
      {branchHandles}
    </div>
  );
}
