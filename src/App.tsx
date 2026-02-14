import { ReactFlowProvider } from '@xyflow/react';
import { Toolbar } from './components/Toolbar/Toolbar';
import { NodeEditor } from './components/NodeEditor/NodeEditor';
import { FieldCanvas } from './components/FieldCanvas/FieldCanvas';
import { PropertiesPanel } from './components/PropertiesPanel/PropertiesPanel';
import { SimulationControls } from './components/SimulationControls/SimulationControls';
import './App.css';

function App() {
  return (
    <ReactFlowProvider>
      <div className="app">
        <Toolbar />
        <div className="app-body">
          <div className="main-area">
            <div className="field-panel">
              <FieldCanvas />
              <SimulationControls />
            </div>
            <div className="editor-panel">
              <NodeEditor />
            </div>
          </div>
          <PropertiesPanel />
        </div>
      </div>
    </ReactFlowProvider>
  );
}

export default App;
