import { useStore } from '../../store/useStore';
import type { LogicNodeType } from '../../types/nodes';
import { useCallback } from 'react';
import './Toolbar.css';

const NODE_BUTTONS: { type: LogicNodeType; label: string; icon: string; color: string }[] = [
  { type: 'move', label: 'Move', icon: '📍', color: '#89b4fa' },
  { type: 'parallel', label: 'Parallel', icon: '⚡', color: '#f9e2af' },
  { type: 'split', label: 'Split', icon: '🔀', color: '#f38ba8' },
  { type: 'merge', label: 'Merge', icon: '🔗', color: '#94e2d5' },
  { type: 'while', label: 'While', icon: '🔄', color: '#cba6f7' },
  { type: 'wait', label: 'Wait', icon: '⏳', color: '#fab387' },
  { type: 'action', label: 'Action', icon: '▶️', color: '#74c7ec' },
];

export function Toolbar() {
  const addNode = useStore((s) => s.addNode);
  const exportToJson = useStore((s) => s.exportToJson);
  const importFromJson = useStore((s) => s.importFromJson);
  const projectName = useStore((s) => s.projectName);
  const setProjectName = useStore((s) => s.setProjectName);
  const setFieldImageUrl = useStore((s) => s.setFieldImageUrl);

  const handleExport = useCallback(() => {
    const data = exportToJson();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name.replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportToJson]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          importFromJson(data);
        } catch {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [importFromJson]);

  const handleLoadFieldImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setFieldImageUrl(url);
    };
    input.click();
  }, [setFieldImageUrl]);

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <div className="toolbar-brand">
          <span className="brand-icon">🤖</span>
          <input
            className="project-name-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            title="Project name"
          />
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <span className="toolbar-section-label">Add Node</span>
          <div className="toolbar-buttons">
            {NODE_BUTTONS.map((btn) => (
              <button
                key={btn.type}
                className="toolbar-btn"
                onClick={() => addNode(btn.type)}
                title={`Add ${btn.label} node`}
                style={{ '--btn-color': btn.color } as React.CSSProperties}
              >
                <span className="btn-icon">{btn.icon}</span>
                <span className="btn-label">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="toolbar-right">
        <button className="toolbar-action-btn field-btn" onClick={handleLoadFieldImage} title="Load field image">
          🗺️ Field
        </button>
        <button className="toolbar-action-btn import-btn" onClick={handleImport} title="Import JSON">
          📂 Import
        </button>
        <button className="toolbar-action-btn export-btn" onClick={handleExport} title="Export to JSON">
          💾 Export
        </button>
      </div>
    </div>
  );
}
