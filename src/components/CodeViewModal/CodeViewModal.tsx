import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { generateCode, type CodeLanguage } from '../../utils/codeGenerator';
import './CodeViewModal.css';

interface CodeViewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CodeViewModal({ isOpen, onClose }: CodeViewModalProps) {
  const [language, setLanguage] = useState<CodeLanguage>('java');
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const projectName = useStore((s) => s.projectName);

  if (!isOpen) return null;

  const { code } = generateCode(nodes, edges, projectName, language);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      alert('Code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const extension = language === 'java' ? 'java' : 'kt';
    const filename = `${projectName.replace(/\s+/g, '')}.${extension}`;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="code-modal-overlay" onClick={onClose}>
      <div className="code-modal" onClick={(e) => e.stopPropagation()}>
        <div className="code-modal-header">
          <h2>Generated Code</h2>
          <button className="close-btn" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="code-modal-toolbar">
          <div className="language-selector">
            <button
              className={`lang-btn ${language === 'java' ? 'active' : ''}`}
              onClick={() => setLanguage('java')}
            >
              Java (FTC)
            </button>
            <button
              className={`lang-btn ${language === 'kotlin' ? 'active' : ''}`}
              onClick={() => setLanguage('kotlin')}
            >
              Kotlin (FTC)
            </button>
          </div>

          <div className="code-actions">
            <button className="action-btn" onClick={handleCopy}>
              <span className="material-icons">content_copy</span> Copy
            </button>
            <button className="action-btn" onClick={handleDownload}>
              <span className="material-icons">download</span> Download
            </button>
          </div>
        </div>

        <div className="code-content">
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
