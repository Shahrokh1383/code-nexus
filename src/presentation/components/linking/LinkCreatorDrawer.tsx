import { JSX, useState } from 'react';
import { DocumentDto } from '../../../domains/documentation/application/dto/document.dto';
import { CodeFileSummaryDto } from '../../../domains/linking/application/dto/link.dto';

interface LinkCreatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentDto[];
  codeFiles: CodeFileSummaryDto[];
  onCreateCodeLink: (codeFileId: string, documentId: string) => void;
  onCreateDocLink: (parentId: string, childId: string) => void;
}

export function LinkCreatorDrawer({ isOpen, onClose, documents, codeFiles, onCreateCodeLink, onCreateDocLink }: LinkCreatorDrawerProps): JSX.Element {
  const [mode, setMode] = useState<'code' | 'doc'>('code');
  const [selectedDoc, setSelectedDoc] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');

  const handleSubmit = () => {
    if (!selectedDoc || !selectedTarget) return;
    if (mode === 'code') {
      onCreateCodeLink(selectedTarget, selectedDoc);
    } else {
      onCreateDocLink(selectedDoc, selectedTarget);
    }
    onClose();
  };

  return (
    <>
      {isOpen && <div className="linking-backdrop" onClick={onClose}></div>}
      <div className={`linking-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>Create New Link</h3>
          <button className="btn btn-ghost" onClick={onClose}><i className="fa-solid fa-times"></i></button>
        </div>
        
        <div className="drawer-body">
          <div className="btn-group w-100 mb-4">
            <button className={`btn ${mode === 'code' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('code')}>
              <i className="fa-solid fa-file-code me-2"></i> Code to Doc
            </button>
            <button className={`btn ${mode === 'doc' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('doc')}>
              <i className="fa-solid fa-sitemap me-2"></i> Doc to Doc
            </button>
          </div>

          <div className="mb-3">
            <label className="form-label text-secondary small">Select Document</label>
            <select className="form-select" value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)}>
              <option value="">Choose a document...</option>
              {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <label className="form-label text-secondary small">
              {mode === 'code' ? 'Select Code File' : 'Select Child Document'}
            </label>
            <select className="form-select" value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)}>
              <option value="">Choose target...</option>
              {mode === 'code' 
                ? codeFiles.map(f => <option key={f.id} value={f.id}>{f.name}</option>)
                : documents.filter(d => d.id !== selectedDoc).map(d => <option key={d.id} value={d.id}>{d.title}</option>)
              }
            </select>
          </div>

          <button className="btn btn-primary w-100" disabled={!selectedDoc || !selectedTarget} onClick={handleSubmit}>
            Create Link
          </button>
        </div>
      </div>
    </>
  );
}