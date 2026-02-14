import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SplitNodeData } from '../../types/nodes';
import { useStore } from '../../store/useStore';
import './NodeStyles.css';

export function SplitNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as SplitNodeData;
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);

  return (
    <div
      className={`logic-node split-node ${selected ? 'selected' : ''}`}
      onClick={() => setSelectedNodeId(id)}
    >
      <Handle type="target" position={Position.Top} className="handle-target" />
      <div className="node-header split-header">
        <span className="node-icon">🔀</span>
        <span className="node-title">{nodeData.label}</span>
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="field-label">If:</span>
          <span className="field-value fn-name">{nodeData.conditionFunctionName}()</span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="handle-source"
        style={{ left: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="handle-source"
        style={{ left: '70%' }}
      />
      <div className="split-labels">
        <span className="split-label split-true">True</span>
        <span className="split-label split-false">False</span>
      </div>
    </div>
  );
}
