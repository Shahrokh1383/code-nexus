import { useEffect, type JSX } from 'react';
import { useFileTree } from '../hooks/useFileTree';
import { useIgnorePatterns } from '../hooks/useIgnorePatterns';
import { useBackgroundWatcher } from '../hooks/useBackgroundWatcher';
import { FileTree } from '../components/file-tree/FileTree';
import { IgnorePatternEditor } from '../components/file-tree/IgnorePatternEditor';
import '../styles/file-browser.css';

export function FileBrowserPage(): JSX.Element {
  const { scanProject, tree, isScanning, totalFiles, totalFolders, error } = useFileTree();
  const { fetchPatterns } = useIgnorePatterns();
  
  useBackgroundWatcher();

  useEffect(() => {
    fetchPatterns();
    if (!tree) scanProject();
  }, []);

  return (
    <div className="file-browser-page">
      <header className="file-browser__header">
        <div className="file-browser__stats">
          {tree && (
            <>
              <span className="pill-success">{totalFiles} Files</span>
              <span className="pill-warning">{totalFolders} Folders</span>
            </>
          )}
        </div>
        <button className="btn-primary" onClick={scanProject} disabled={isScanning}>
          <i className={`fa-solid ${isScanning ? 'fa-spinner fa-spin' : 'fa-radar'}`} />
          {isScanning ? 'Scanning...' : 'Rescan Project'}
        </button>
      </header>

      {error && <div className="file-browser__error pill-error">{error}</div>}

      <div className="file-browser__content">
        <div className="file-browser__tree-container">
          {isScanning && !tree && (
            <div className="file-browser__loading">
              <i className="fa-solid fa-radar fa-spin text-primary" />
              <span>Indexing workspace...</span>
            </div>
          )}
          {tree && <FileTree nodes={[tree]} />}
        </div>
        
        <aside className="file-browser__sidebar">
          <IgnorePatternEditor />
        </aside>
      </div>
    </div>
  );
}