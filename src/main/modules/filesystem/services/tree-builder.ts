import type { FileTreeDto, FolderNodeDto, FileNodeDto } from '@shared/ipc/filesystem';
import { DomainException } from '../../../shared/errors/domain-exception';
import { validateRelativePath, pathNameOf } from '../domain/file-path';
import { IgnorePattern } from '../domain/ignore-pattern';
import type { FsDirEntry, NodeFsProbe } from '../infrastructure/node-fs-probe';
import type { IndexedPath } from '../infrastructure/file-index-store';

function compileMatchers(patterns: readonly string[]): IgnorePattern[] {
  return patterns
    .map((p) => {
      try {
        return new IgnorePattern(p);
      } catch {
        return null;
      }
    })
    .filter((p): p is IgnorePattern => p !== null);
}

/**
 * Builds a SHALLOW tree DTO for one directory, read from disk on demand.
 * Folder children are returned with `children: []` and loaded lazily by the
 * renderer when the user expands them. Keeps workspace-open cost O(children
 * of the requested directory), independent of total workspace size
 * (Constitution §2: Main orchestrates, infra reads OS).
 */
export async function buildFileTree(
  rootPath: string,
  fsProbe: NodeFsProbe,
  parentPath: string | undefined,
  ignorePatterns: readonly string[]
): Promise<FileTreeDto> {
  const targetPath = parentPath ? validateRelativePath(parentPath) : '.';
  const absolutePath = targetPath === '.' ? rootPath : fsProbe.absolutePath(rootPath, targetPath);
  const matchers = compileMatchers(ignorePatterns);

  let entries: FsDirEntry[];
  try {
    entries = await fsProbe.readDir(absolutePath);
  } catch {
    if (targetPath === '.') {
      throw new DomainException(
        'FOLDER_READ_FAILED',
        `Cannot read workspace root at path: ${targetPath}`
      );
    }
    throw new DomainException('FOLDER_NOT_FOUND', `Folder not found at path: ${targetPath}`);
  }

  const children: Array<FileNodeDto | FolderNodeDto> = [];
  let fileCount = 0;
  let folderCount = 0;

  for (const entry of entries) {
    const childPath = targetPath === '.' ? entry.name : `${targetPath}/${entry.name}`;
    if (matchers.some((matcher) => matcher.matches(childPath))) {
      continue;
    }

    if (entry.isDirectory) {
      children.push({ id: childPath, path: childPath, name: entry.name, children: [] });
      folderCount++;
    } else {
      children.push({
        id: childPath,
        path: childPath,
        name: entry.name,
        lastModified: entry.lastModified,
        isDirectory: false,
      });
      fileCount++;
    }
  }

  children.sort((a, b) => {
    const aIsDir = !('lastModified' in a);
    const bIsDir = !('lastModified' in b);
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const root: FolderNodeDto = {
    id: targetPath === '.' ? 'root' : targetPath,
    path: targetPath,
    name: targetPath === '.' ? '.' : pathNameOf(targetPath),
    children,
  };

  return { root, totalFiles: fileCount, totalFolders: folderCount };
}

export function buildFileTreeFromIndex(
  parentPath: string,
  entries: readonly IndexedPath[],
  ignorePatterns: readonly string[]
): FileTreeDto {
  const matchers = compileMatchers(ignorePatterns);
  const children: Array<FileNodeDto | FolderNodeDto> = [];
  let fileCount = 0;
  let folderCount = 0;

  for (const { path, entry } of entries) {
    if (matchers.some((matcher) => matcher.matches(path))) {
      continue;
    }

    const name = pathNameOf(path);

    if (entry.isDirectory) {
      children.push({ id: path, path, name, children: [] });
      folderCount++;
    } else {
      children.push({
        id: path,
        path,
        name,
        lastModified: entry.lastModified,
        isDirectory: false,
      });
      fileCount++;
    }
  }

  children.sort((a, b) => {
    const aIsDir = !('lastModified' in a);
    const bIsDir = !('lastModified' in b);
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const root: FolderNodeDto = {
    id: parentPath === '.' ? 'root' : parentPath,
    path: parentPath,
    name: parentPath === '.' ? '.' : pathNameOf(parentPath),
    children,
  };

  return { root, totalFiles: fileCount, totalFolders: folderCount };
}