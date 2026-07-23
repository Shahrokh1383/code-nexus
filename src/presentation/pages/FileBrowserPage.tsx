import { useEffect, useState, useCallback, type JSX } from 'react';
import { useFileTree } from '../hooks/useFileTree';
import { useIgnorePatterns } from '../hooks/useIgnorePatterns';
import { useWorkspaceStore } from '../stores/workspace.store';
import { SelectableFileTree } from '../components/file-tree/SelectableFileTree';
import { IgnorePatternEditor } from '../components/file-tree/IgnorePatternEditor';
import '../styles/file-browser.css';

export function FileBrowserPage(): JSX.Element {
  const { fetchFileTree, tree, totalFiles, totalFolders, error } = useFileTree();
  const workspace = useWorkspaceStore((s) => s.workspace);

  const { fetchPatterns } = useIgnorePatterns({ onPatternChange: fetchFileTree });

  // Selection state for ignoring files/folders
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const { addPattern } = useIgnorePatterns();

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  useEffect(() => {
    if (workspace && !tree) {
      fetchFileTree();
    }
  }, [workspace, tree, fetchFileTree]);

  const handleToggleSelect = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleIgnoreSelected = async () => {
    if (selectedPaths.size === 0) return;
    for (const path of selectedPaths) {
      await addPattern(path);
    }
    setSelectedPaths(new Set());
  };

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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {selectedPaths.size > 0 && (
            <button className="btn-primary" onClick={handleIgnoreSelected}>
              <i className="fa-solid fa-eye-slash" /> Ignore Selected ({selectedPaths.size})
            </button>
          )}
        </div>
      </header>

      {error && <div className="file-browser__error pill-error">{error}</div>}

      <div className="file-browser__content">
        <div className="file-browser__tree-container">
          {tree ? (
            <SelectableFileTree
              nodes={[tree]}
              selectedPaths={selectedPaths}
              onToggleSelect={handleToggleSelect}
            />
          ) : (
            <div className="file-browser__loading">
              <i className="fa-solid fa-folder-open text-primary" />
              <span>Loading workspace...</span>
            </div>
          )}
        </div>

        <aside className="file-browser__sidebar">
          <IgnorePatternEditor />
        </aside>
      </div>
    </div>
  );
}