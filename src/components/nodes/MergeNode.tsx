import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { MergeNodeData } from '../../types/nodes';
import { useStore } from '../../store/useStore';
import './NodeStyles.css';

export function MergeNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as MergeNodeData;
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);

  return (
    <div
      className={`logic-node merge-node ${selected ? 'selected' : ''}`}
      onClick={() => setSelectedNodeId(id)}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="in-0"
        className="handle-target"
        style={{ left: '30%' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="in-1"
        className="handle-target"
        style={{ left: '70%' }}
      />
      <div className="node-header merge-header">
        <span className="material-icons node-icon">call_merge</span>
        <span className="node-title">{nodeData.label}</span>
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="field-label">Joins branches</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="handle-source" />
    </div>
  );
}
