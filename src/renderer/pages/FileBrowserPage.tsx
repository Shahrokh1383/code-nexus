import { memo, useCallback, useEffect, useMemo, type JSX } from 'react';
import {
  useFileTree,
  useIgnorePatterns,
  SelectableFileTree,
  IgnorePatternEditor,
  useFilesystemTreeUpdates,
  useFileSystemStore,
} from '../features/filesystem';
import '../shared/styles/file-browser.css';

const Sidebar = memo(function Sidebar(): JSX.Element {
  return <IgnorePatternEditor />;
});

export function FileBrowserPage(): JSX.Element {
  useFilesystemTreeUpdates();
  const { tree, totalFiles, totalFolders, error, isScanning } = useFileTree();
  const { addPattern, error: patternError } = useIgnorePatterns();

  const selectedPaths = useFileSystemStore((s) => s.selectedPaths);
  const clearSelection = useFileSystemStore((s) => s.clearSelection);

  // Stable `nodes` array — otherwise `[tree]` creates a new ref every render,
  // breaking `SelectableFileTree`'s memo and cascading the tree re-render.
  const treeNodes = useMemo(() => (tree ? [tree] : []), [tree]);

  useEffect(() => {
    if (isScanning) clearSelection();
  }, [isScanning, clearSelection]);

  const handleIgnoreSelected = useCallback(async (): Promise<void> => {
    if (selectedPaths.size === 0) return;
    for (const path of selectedPaths) {
      await addPattern(path);
    }
    clearSelection();
  }, [selectedPaths, addPattern, clearSelection]);

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
            <SelectableFileTree nodes={treeNodes} />
          ) : (
            <div className="file-browser__loading">
              <i className="fa-solid fa-folder-open text-primary" />
              <span>Loading workspace...</span>
            </div>
          )}
        </div>

        <aside className="file-browser__sidebar">
          <Sidebar />
        </aside>
      </div>
    </div>
  );
}