import {
  memo,
  type JSX,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import type { FileNodeDto, FolderNodeDto } from '@shared/ipc/filesystem';
import { useFileSystemStore, isFolderNode } from '../stores/filesystem.store';
import { FileNode } from './FileNode';
import { useFileTree } from '../hooks/useFileTree';

const INITIAL_VISIBLE_CHILDREN = 50;
const CHILD_CHUNK_SIZE = 100;
const SENTINEL_ROOT_MARGIN = '200px';

interface SelectableFileNodeProps {
  node: FileNodeDto | FolderNodeDto;
  depth: number;
}

export const SelectableFileNode = memo(function SelectableFileNode({
  node,
  depth,
}: SelectableFileNodeProps): JSX.Element {
  const isFolder = isFolderNode(node);
  const isExpanded = useFileSystemStore((s) => s.expandedPaths.has(node.path));
  const isSelected = useFileSystemStore((s) => s.selectedPaths.has(node.path));
  const toggleSelection = useFileSystemStore((s) => s.toggleSelection);

  return (
    <div className="file-tree__branch">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <label className="cn-checkbox-label" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            className="cn-checkbox"
            checked={isSelected}
            onChange={() => toggleSelection(node.path)}
          />
        </label>
        <div style={{ flex: 1 }}>
          <FileNode node={node} depth={depth} isExpanded={isExpanded} />
        </div>
      </div>
      {isFolder && isExpanded && (
        <FolderChildren folderPath={node.path} depth={depth + 1} />
      )}
    </div>
  );
});

interface FolderChildrenProps {
  folderPath: string;
  depth: number;
}

const FolderChildren = memo(function FolderChildren({
  folderPath,
  depth,
}: FolderChildrenProps): JSX.Element {
  const { tree } = useFileTree(folderPath);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CHILDREN);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const childCount = tree?.children.length ?? 0;

  useEffect(() => {
    if (childCount === 0) return;
    if (visibleCount >= childCount) return;

    let scheduled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (scheduled) return;
        scheduled = true;
        // Use setTimeout to yield to the browser's paint cycle and prevent freezing.
        setTimeout(() => {
          scheduled = false;
          setVisibleCount((c) => Math.min(c + CHILD_CHUNK_SIZE, childCount));
        }, 16);
      },
      { rootMargin: SENTINEL_ROOT_MARGIN }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [childCount, visibleCount]);

  const visible = useMemo(
    () => (tree ? tree.children.slice(0, visibleCount) : []),
    [tree, visibleCount]
  );

  if (!tree) {
    return (
      <div
        className="file-tree__loading"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        aria-busy="true"
      >
        Loading…
      </div>
    );
  }
  if (tree.children.length === 0) return <></>;

  const hasMore = visible.length < tree.children.length;

  return (
    <div className="file-tree" role="group">
      {visible.map((child) => (
        <SelectableFileNode key={child.path} node={child} depth={depth} />
      ))}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />}
    </div>
  );
});