import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { StartNodeData } from '../../types/nodes';
import { useStore } from '../../store/useStore';
import './NodeStyles.css';

export function StartNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as StartNodeData;
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);

  return (
    <div
      className={`logic-node start-node ${selected ? 'selected' : ''}`}
      onClick={() => setSelectedNodeId(id)}
    >
      <div className="node-header start-header">
        <span className="node-icon">🏁</span>
        <span className="node-title">{nodeData.label}</span>
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="field-label">Pos:</span>
          <span className="field-value">
            ({nodeData.position.x.toFixed(1)}, {nodeData.position.y.toFixed(1)})
          </span>
        </div>
        <div className="node-field">
          <span className="field-label">Heading:</span>
          <span className="field-value">{nodeData.heading}°</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="handle-source" />
    </div>
  );
}
