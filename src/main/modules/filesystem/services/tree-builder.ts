import type { FileTreeDto, FolderNodeDto, FileNodeDto } from '@shared/ipc/filesystem';
import { DomainException } from '../../../shared/errors/domain-exception';
import { validateRelativePath, pathNameOf } from '../domain/file-path';
import { IgnorePattern } from '../domain/ignore-pattern';
import type { FileIndexStore } from '../infrastructure/file-index-store';

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
 * Builds the DTO tree from the file index (ports the legacy
 * GetFileTreeHandler), including the synthetic empty-root response and
 * query-time ignore filtering.
 */
export async function buildFileTree(
  store: FileIndexStore,
  parentPath: string | undefined,
  ignorePatterns: readonly string[]
): Promise<FileTreeDto> {
  const targetPath = parentPath ? validateRelativePath(parentPath) : '.';

  const target = await store.findByPath(targetPath);
  if (!target) {
    if (targetPath === '.') {
      return {
        root: { id: 'root', path: '.', name: '.', children: [] },
        totalFiles: 0,
        totalFolders: 1,
      };
    }
    throw new DomainException('FOLDER_NOT_FOUND', `Folder not found at path: ${targetPath}`);
  }

  if (!target.isDirectory) {
    throw new DomainException('NOT_A_FOLDER', `Path is not a folder: ${targetPath}`);
  }

  const matchers = compileMatchers(ignorePatterns);
  const { dto, fileCount, folderCount } = await buildFolderDto(store, targetPath, matchers);
  return { root: dto, totalFiles: fileCount, totalFolders: folderCount };
}

async function buildFolderDto(
  store: FileIndexStore,
  folderPath: string,
  matchers: readonly IgnorePattern[]
): Promise<{ dto: FolderNodeDto; fileCount: number; folderCount: number }> {
  const children = await store.findChildrenOf(folderPath);
  const childDtos: Array<FileNodeDto | FolderNodeDto> = [];
  let fileCount = 0;
  let folderCount = 1;

  const rootEntry = await store.findByPath(folderPath);

  for (const { path, entry } of children) {
    if (matchers.some((matcher) => matcher.matches(path))) {
      continue;
    }

    if (entry.isDirectory) {
      const nested = await buildFolderDto(store, path, matchers);
      childDtos.push(nested.dto);
      fileCount += nested.fileCount;
      folderCount += nested.folderCount;
    } else {
      childDtos.push({
        id: entry.id,
        path,
        name: pathNameOf(path),
        lastModified: entry.lastModified,
        isDirectory: false,
      });
      fileCount++;
    }
  }

  return {
    dto: {
      id: rootEntry?.id ?? 'root',
      path: folderPath,
      name: pathNameOf(folderPath),
      children: childDtos,
    },
    fileCount,
    folderCount,
  };
}