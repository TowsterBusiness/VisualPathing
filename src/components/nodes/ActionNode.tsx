import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ActionNodeData } from '../../types/nodes';
import { useStore } from '../../store/useStore';
import './NodeStyles.css';

export function ActionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActionNodeData;
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);

  return (
    <div
      className={`logic-node action-node ${selected ? 'selected' : ''}`}
      onClick={() => setSelectedNodeId(id)}
    >
      <Handle type="target" position={Position.Top} className="handle-target" />
      <div className="node-header action-header">
        <span className="node-icon">▶️</span>
        <span className="node-title">{nodeData.label}</span>
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="field-label">Function:</span>
          <span className="field-value fn-name">{nodeData.functionName}()</span>
        </div>
        <div className="node-field">
          <span className="field-label">Mode:</span>
          <span className="field-value">{nodeData.runMode === 'every_loop' ? 'Every Loop' : 'Once'}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="handle-source" />
    </div>
  );
}
