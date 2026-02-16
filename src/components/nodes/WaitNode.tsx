import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WaitNodeData } from '../../types/nodes';
import { useStore } from '../../store/useStore';
import './NodeStyles.css';

export function WaitNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as WaitNodeData;
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);

  return (
    <div
      className={`logic-node wait-node ${selected ? 'selected' : ''}`}
      onClick={() => setSelectedNodeId(id)}
    >
      <Handle type="target" position={Position.Top} className="handle-target" />
      <div className="node-header wait-header">
        <span className="material-icons node-icon">schedule</span>
        <span className="node-title">{nodeData.label}</span>
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="field-label">Until:</span>
          <span className="field-value fn-name">{nodeData.conditionFunctionName}()</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="handle-source" />
    </div>
  );
}
