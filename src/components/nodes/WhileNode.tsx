import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WhileNodeData } from '../../types/nodes';
import { useStore } from '../../store/useStore';
import './NodeStyles.css';

export function WhileNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as WhileNodeData;
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);

  return (
    <div
      className={`logic-node while-node ${selected ? 'selected' : ''}`}
      onClick={() => setSelectedNodeId(id)}
    >
      <Handle type="target" position={Position.Top} className="handle-target" />
      <div className="node-header while-header">
        <span className="material-icons node-icon">loop</span>
        <span className="node-title">{nodeData.label}</span>
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="field-label">Condition:</span>
          <span className="field-value fn-name">{nodeData.conditionFunctionName}()</span>
        </div>
        <div className="node-field">
          <span className="field-label">Mode:</span>
          <span className="field-value">{nodeData.runMode === 'every_loop' ? 'Every Loop' : 'Once'}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="body" className="handle-source" />
      <Handle
        type="source"
        position={Position.Right}
        id="next"
        className="handle-source handle-right"
      />
    </div>
  );
}
