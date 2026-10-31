import { useEffect, useState, useCallback, type JSX } from 'react';
import { useFileTree, useIgnorePatterns, SelectableFileTree, IgnorePatternEditor, useFilesystemTreeUpdates } from '../features/filesystem';
import '../shared/styles/file-browser.css';

export function FileBrowserPage(): JSX.Element {
  useFilesystemTreeUpdates();
  const { tree, totalFiles, totalFolders, error, isScanning } = useFileTree();
  const { addPattern, error: patternError } = useIgnorePatterns();

  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isScanning) {
      setSelectedPaths(new Set());
    }
  }, [isScanning]);

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

  const handleIgnoreSelected = async (): Promise<void> => {
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

      {(error || patternError) && (
        <div className="file-browser__error pill-error">{error ?? patternError}</div>
      )}

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