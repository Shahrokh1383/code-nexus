import type { FileTreeDto } from '@shared/ipc/filesystem';
import type { WorkspaceServiceContract } from '../../../workspace/services/contracts/WorkspaceServiceContract';
import { IgnorePattern } from '../../domain/ignore-pattern';
import { pathNameOf } from '../../domain/file-path';
import { DEFAULT_IGNORED_SEGMENTS } from '../../infrastructure/chokidar-watcher';
import type { NodeFsProbe } from '../../infrastructure/node-fs-probe';
import type { FileIndexStore } from '../../infrastructure/file-index-store';
import { buildFileTree, buildFileTreeFromIndex, MAX_CHILDREN } from '../tree-builder';

function compilePatterns(raw: readonly string[]): IgnorePattern[] {
  const compiled: IgnorePattern[] = [];
  for (const p of raw) {
    try { compiled.push(new IgnorePattern(p)); } catch { /* invalid skipped */ }
  }
  return compiled;
}

export class FileTreeQuery {
  constructor(
    private readonly fsProbe: NodeFsProbe,
    private readonly workspace: () => WorkspaceServiceContract
  ) {}

  async getFileTree(
    store: FileIndexStore,
    rootPath: string,
    workspaceId: string,
    parentPath?: string
  ): Promise<FileTreeDto> {
    const patterns = await this.workspace().getIgnorePatterns(workspaceId);
    const parent = parentPath ?? '.';
    const compiled = compilePatterns(patterns);
    const isIgnored =
      parent !== '.' &&
      (parent.split('/').some((s) => DEFAULT_IGNORED_SEGMENTS.has(s)) ||
        compiled.some((matcher) => {
          try { return matcher.matches(parent); } catch { return false; }
        }));

    if (isIgnored) {
      return {
        root: { id: parent, path: parent, name: pathNameOf(parent), children: [] },
        totalFiles: 0,
        totalFolders: 0,
      };
    }

    const parentEntry =
      parent === '.' ? { isDirectory: true as const } : await store.findByPath(parent);

    if (parentEntry?.isDirectory) {
      const indexed = await store.findChildrenOf(parent, MAX_CHILDREN);
      return buildFileTreeFromIndex(parent, indexed, patterns);
    }

    return buildFileTree(rootPath, this.fsProbe, parentPath, patterns);
  }

  async getIgnoredFiles(workspaceId: string): Promise<string[]> {
    return this.workspace().getIgnorePatterns(workspaceId);
  }
}