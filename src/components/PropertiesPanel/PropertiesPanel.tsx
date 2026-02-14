import { useStore } from '../../store/useStore';
import type {
  LogicNodeData,
  StartNodeData,
  MoveNodeData,
  ParallelNodeData,
  SplitNodeData,
  WhileNodeData,
  WaitNodeData,
  ActionNodeData,
} from '../../types/nodes';
import './PropertiesPanel.css';

export function PropertiesPanel() {
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const getNode = useStore((s) => s.getNode);
  const updateNodeData = useStore((s) => s.updateNodeData);
  const deleteNode = useStore((s) => s.deleteNode);

  if (!selectedNodeId) {
    return (
      <div className="properties-panel">
        <div className="panel-header">Properties</div>
        <div className="panel-empty">Select a node to edit its properties</div>
      </div>
    );
  }

  const node = getNode(selectedNodeId);
  if (!node) return null;

  const data = node.data as LogicNodeData;

  const update = (partial: Partial<LogicNodeData>) => {
    updateNodeData(selectedNodeId, partial);
  };

  return (
    <div className="properties-panel" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <div className="panel-header">
        <span>Properties</span>
        {data.type !== 'start' && (
          <button
            className="delete-btn"
            onClick={() => deleteNode(selectedNodeId)}
            title="Delete node"
          >
            🗑️
          </button>
        )}
      </div>

      <div className="panel-section">
        <label className="prop-label">Label</label>
        <input
          className="prop-input"
          value={data.label}
          onChange={(e) => update({ label: e.target.value })}
        />
      </div>

      <div className="panel-section">
        <div className="node-type-badge" data-type={data.type}>
          {data.type.toUpperCase()}
        </div>
      </div>

      {data.type === 'start' && <StartProperties data={data} update={update} />}
      {data.type === 'move' && <MoveProperties data={data} update={update} />}
      {data.type === 'parallel' && <ParallelProperties data={data} update={update} />}
      {data.type === 'split' && <SplitProperties data={data} update={update} />}
      {data.type === 'merge' && <MergeProperties />}
      {data.type === 'while' && <WhileProperties data={data} update={update} />}
      {data.type === 'wait' && <WaitProperties data={data} update={update} />}
      {data.type === 'action' && <ActionProperties data={data} update={update} />}
    </div>
  );
}

/* ===== Per-type property editors ===== */

function StartProperties({
  data,
  update,
}: {
  data: StartNodeData;
  update: (p: Partial<LogicNodeData>) => void;
}) {
  return (
    <>
      <div className="panel-section">
        <label className="prop-label">Position</label>
        <div className="prop-row">
          <div className="prop-field">
            <span className="prop-prefix">X</span>
            <input
              type="number"
              className="prop-input prop-number"
              value={data.position.x}
              onChange={(e) =>
                update({
                  position: { ...data.position, x: parseFloat(e.target.value) || 0 },
                } as Partial<StartNodeData>)
              }
            />
          </div>
          <div className="prop-field">
            <span className="prop-prefix">Y</span>
            <input
              type="number"
              className="prop-input prop-number"
              value={data.position.y}
              onChange={(e) =>
                update({
                  position: { ...data.position, y: parseFloat(e.target.value) || 0 },
                } as Partial<StartNodeData>)
              }
            />
          </div>
        </div>
      </div>
      <div className="panel-section">
        <label className="prop-label">Heading (degrees)</label>
        <input
          type="number"
          className="prop-input"
          value={data.heading}
          onChange={(e) =>
            update({ heading: parseFloat(e.target.value) || 0 } as Partial<StartNodeData>)
          }
        />
      </div>
    </>
  );
}

function MoveProperties({
  data,
  update,
}: {
  data: MoveNodeData;
  update: (p: Partial<LogicNodeData>) => void;
}) {
  return (
    <>
      <div className="panel-section">
        <label className="prop-label">Target Position</label>
        <div className="prop-row">
          <div className="prop-field">
            <span className="prop-prefix">X</span>
            <input
              type="number"
              className="prop-input prop-number"
              value={data.targetPosition.x}
              onChange={(e) =>
                update({
                  targetPosition: {
                    ...data.targetPosition,
                    x: parseFloat(e.target.value) || 0,
                  },
                } as Partial<MoveNodeData>)
              }
            />
          </div>
          <div className="prop-field">
            <span className="prop-prefix">Y</span>
            <input
              type="number"
              className="prop-input prop-number"
              value={data.targetPosition.y}
              onChange={(e) =>
                update({
                  targetPosition: {
                    ...data.targetPosition,
                    y: parseFloat(e.target.value) || 0,
                  },
                } as Partial<MoveNodeData>)
              }
            />
          </div>
        </div>
      </div>

      <div className="panel-section">
        <label className="prop-label">Target Heading (degrees)</label>
        <input
          type="number"
          className="prop-input"
          value={data.targetHeading}
          onChange={(e) =>
            update({
              targetHeading: parseFloat(e.target.value) || 0,
            } as Partial<MoveNodeData>)
          }
        />
      </div>

      <div className="panel-section">
        <label className="prop-label">Control Point 1 (relative to start)</label>
        <div className="prop-row">
          <div className="prop-field">
            <span className="prop-prefix">X</span>
            <input
              type="number"
              className="prop-input prop-number"
              value={data.controlPoint1.x}
              onChange={(e) =>
                update({
                  controlPoint1: {
                    ...data.controlPoint1,
                    x: parseFloat(e.target.value) || 0,
                  },
                } as Partial<MoveNodeData>)
              }
            />
          </div>
          <div className="prop-field">
            <span className="prop-prefix">Y</span>
            <input
              type="number"
              className="prop-input prop-number"
              value={data.controlPoint1.y}
              onChange={(e) =>
                update({
                  controlPoint1: {
                    ...data.controlPoint1,
                    y: parseFloat(e.target.value) || 0,
                  },
                } as Partial<MoveNodeData>)
              }
            />
          </div>
        </div>
      </div>

      <div className="panel-section">
        <label className="prop-label">Control Point 2 (relative to end)</label>
        <div className="prop-row">
          <div className="prop-field">
            <span className="prop-prefix">X</span>
            <input
              type="number"
              className="prop-input prop-number"
              value={data.controlPoint2.x}
              onChange={(e) =>
                update({
                  controlPoint2: {
                    ...data.controlPoint2,
                    x: parseFloat(e.target.value) || 0,
                  },
                } as Partial<MoveNodeData>)
              }
            />
          </div>
          <div className="prop-field">
            <span className="prop-prefix">Y</span>
            <input
              type="number"
              className="prop-input prop-number"
              value={data.controlPoint2.y}
              onChange={(e) =>
                update({
                  controlPoint2: {
                    ...data.controlPoint2,
                    y: parseFloat(e.target.value) || 0,
                  },
                } as Partial<MoveNodeData>)
              }
            />
          </div>
        </div>
      </div>

      <div className="panel-section">
        <label className="prop-label prop-checkbox-label">
          <input
            type="checkbox"
            checked={data.ambiguousStart}
            onChange={(e) =>
              update({ ambiguousStart: e.target.checked } as Partial<MoveNodeData>)
            }
          />
          <span>Ambiguous Start Position</span>
        </label>
      </div>

      {data.ambiguousStart && (
        <div className="panel-section">
          <label className="prop-label">Override Start Position</label>
          <div className="prop-row">
            <div className="prop-field">
              <span className="prop-prefix">X</span>
              <input
                type="number"
                className="prop-input prop-number"
                value={data.overrideStartPosition?.x ?? 0}
                onChange={(e) =>
                  update({
                    overrideStartPosition: {
                      x: parseFloat(e.target.value) || 0,
                      y: data.overrideStartPosition?.y ?? 0,
                    },
                  } as Partial<MoveNodeData>)
                }
              />
            </div>
            <div className="prop-field">
              <span className="prop-prefix">Y</span>
              <input
                type="number"
                className="prop-input prop-number"
                value={data.overrideStartPosition?.y ?? 0}
                onChange={(e) =>
                  update({
                    overrideStartPosition: {
                      x: data.overrideStartPosition?.x ?? 0,
                      y: parseFloat(e.target.value) || 0,
                    },
                  } as Partial<MoveNodeData>)
                }
              />
            </div>
          </div>
          <div className="panel-section" style={{ marginTop: 8 }}>
            <label className="prop-label">Override Start Heading</label>
            <input
              type="number"
              className="prop-input"
              value={data.overrideStartHeading ?? 0}
              onChange={(e) =>
                update({
                  overrideStartHeading: parseFloat(e.target.value) || 0,
                } as Partial<MoveNodeData>)
              }
            />
          </div>
        </div>
      )}
    </>
  );
}

function ParallelProperties({
  data,
  update,
}: {
  data: ParallelNodeData;
  update: (p: Partial<LogicNodeData>) => void;
}) {
  return (
    <div className="panel-section">
      <label className="prop-label">Number of Branches</label>
      <input
        type="number"
        className="prop-input"
        min={2}
        max={8}
        value={data.branchCount}
        onChange={(e) =>
          update({
            branchCount: Math.max(2, Math.min(8, parseInt(e.target.value) || 2)),
          } as Partial<ParallelNodeData>)
        }
      />
    </div>
  );
}

function SplitProperties({
  data,
  update,
}: {
  data: SplitNodeData;
  update: (p: Partial<LogicNodeData>) => void;
}) {
  return (
    <div className="panel-section">
      <label className="prop-label">Condition Function</label>
      <div className="fn-prompt">
        <span className="fn-keyword">boolean</span>
        <input
          className="prop-input fn-input"
          value={data.conditionFunctionName}
          onChange={(e) =>
            update({ conditionFunctionName: e.target.value } as Partial<SplitNodeData>)
          }
          placeholder="functionName"
        />
        <span className="fn-parens">()</span>
      </div>
      <div className="fn-hint">
        <code>true</code> &rarr; left branch &nbsp;|&nbsp; <code>false</code> &rarr; right branch
      </div>
    </div>
  );
}

function MergeProperties() {
  return (
    <div className="panel-section">
      <div className="fn-hint">
        All incoming branches must end at the <strong>same field position</strong> for the path to be valid.
      </div>
    </div>
  );
}

function WhileProperties({
  data,
  update,
}: {
  data: WhileNodeData;
  update: (p: Partial<LogicNodeData>) => void;
}) {
  return (
    <>
      <div className="panel-section">
        <label className="prop-label">Condition Function</label>
        <div className="fn-prompt">
          <span className="fn-keyword">boolean</span>
          <input
            className="prop-input fn-input"
            value={data.conditionFunctionName}
            onChange={(e) =>
              update({ conditionFunctionName: e.target.value } as Partial<WhileNodeData>)
            }
            placeholder="functionName"
          />
          <span className="fn-parens">()</span>
        </div>
        <div className="fn-hint">
          This function should return <code>true</code> to continue looping
        </div>
      </div>
      <div className="panel-section">
        <label className="prop-label">Run Mode</label>
        <select
          className="prop-select"
          value={data.runMode}
          onChange={(e) =>
            update({
              runMode: e.target.value as 'every_loop' | 'once',
            } as Partial<WhileNodeData>)
          }
        >
          <option value="every_loop">Every Loop</option>
          <option value="once">Once</option>
        </select>
      </div>
    </>
  );
}

function WaitProperties({
  data,
  update,
}: {
  data: WaitNodeData;
  update: (p: Partial<LogicNodeData>) => void;
}) {
  return (
    <div className="panel-section">
      <label className="prop-label">Condition Function</label>
      <div className="fn-prompt">
        <span className="fn-keyword">boolean</span>
        <input
          className="prop-input fn-input"
          value={data.conditionFunctionName}
          onChange={(e) =>
            update({ conditionFunctionName: e.target.value } as Partial<WaitNodeData>)
          }
          placeholder="functionName"
        />
        <span className="fn-parens">()</span>
      </div>
      <div className="fn-hint">
        Execution pauses until this returns <code>true</code>
      </div>
    </div>
  );
}

function ActionProperties({
  data,
  update,
}: {
  data: ActionNodeData;
  update: (p: Partial<LogicNodeData>) => void;
}) {
  return (
    <>
      <div className="panel-section">
        <label className="prop-label">Function</label>
        <div className="fn-prompt">
          <span className="fn-keyword">void</span>
          <input
            className="prop-input fn-input"
            value={data.functionName}
            onChange={(e) =>
              update({ functionName: e.target.value } as Partial<ActionNodeData>)
            }
            placeholder="functionName"
          />
          <span className="fn-parens">()</span>
        </div>
      </div>
      <div className="panel-section">
        <label className="prop-label">Run Mode</label>
        <select
          className="prop-select"
          value={data.runMode}
          onChange={(e) =>
            update({
              runMode: e.target.value as 'every_loop' | 'once',
            } as Partial<ActionNodeData>)
          }
        >
          <option value="once">Run Once</option>
          <option value="every_loop">Every Loop</option>
        </select>
      </div>
    </>
  );
}
