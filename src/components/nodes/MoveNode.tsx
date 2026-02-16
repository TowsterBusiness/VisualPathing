import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { MoveNodeData } from '../../types/nodes';
import { useStore } from '../../store/useStore';
import './NodeStyles.css';

export function MoveNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as MoveNodeData;
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);

  return (
    <div
      className={`logic-node move-node ${selected ? 'selected' : ''}`}
      onClick={() => setSelectedNodeId(id)}
    >
      <Handle type="target" position={Position.Top} className="handle-target" />
      <div className="node-header move-header">
        <span className="material-icons node-icon">near_me</span>
        <span className="node-title">{nodeData.label}</span>
        {nodeData.ambiguousStart && <span className="node-badge">AMB</span>}
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="field-label">Target:</span>
          <span className="field-value">
            ({nodeData.targetPosition.x.toFixed(1)}, {nodeData.targetPosition.y.toFixed(1)})
          </span>
        </div>
        <div className="node-field">
          <span className="field-label">Heading:</span>
          <span className="field-value">{nodeData.targetHeading}°</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="handle-source" />
    </div>
  );
}
