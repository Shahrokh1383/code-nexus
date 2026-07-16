import { FileNode } from '../entities/file-node';
import { FolderNode } from '../entities/folder-node';
import { FileNodeId } from '../value-objects/file-node-id';
import { FolderNodeId } from '../value-objects/folder-node-id';
import { FilePath } from '../value-objects/file-path';
import { FileSize } from '../value-objects/file-size';
import { FileHash } from '../value-objects/file-hash';
import { IgnorePattern } from '../value-objects/ignore-pattern';
import { FileDiscoveredEvent } from '../events/file-discovered';
import { ScanCompletedEvent } from '../events/scan-completed';
import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { Maybe } from '../../../shared-kernel/types/maybe';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';

export interface FileMetadata {
  readonly path: string;
  readonly name: string;
  readonly size: number;
  readonly lastModified: Date;
  readonly isDirectory: boolean;
  readonly hash?: string;
}

export interface ScanResult {
  readonly rootFolder: FolderNode;
  readonly events: ReadonlyArray<DomainEvent>;
  readonly fileCount: number;
  readonly folderCount: number;
  readonly durationMs: number;
}

export class ScanProjectService {
  scan(
    rootPath: FilePath,
    ignorePatterns: IgnorePattern[],
    files: FileMetadata[],
    existingIds?: Map<string, string>
  ): ScanResult {
    const startTime = Date.now();

    const filtered = files.filter(meta => !this.isIgnored(meta.path, ignorePatterns));

    const rootId = existingIds?.get(rootPath.value) ?? UuidGenerator.generate();
    const rootFolder = new FolderNode(
      new FolderNodeId(rootId),
      rootPath,
      rootPath.getName() || '.'
    );

    const folderMap = new Map<string, FolderNode>();
    folderMap.set(rootPath.value, rootFolder);

    const events: DomainEvent[] = [];
    let fileCount = 0;
    let folderCount = 1;

    const sorted = [...filtered].sort(
      (a, b) => a.path.split('/').length - b.path.split('/').length
    );

    for (const meta of sorted) {
      const path = new FilePath(meta.path);

      if (path.equals(rootPath)) {
        continue;
      }

      const parentPath = path.getParentPath();
      const parent = folderMap.get(parentPath.value);

      if (!parent) {
        continue;
      }

      if (meta.isDirectory) {
        const folderId = existingIds?.get(path.value) ?? UuidGenerator.generate();
        const folder = new FolderNode(new FolderNodeId(folderId), path, meta.name);
        parent.addChild(folder);
        folderMap.set(path.value, folder);
        folderCount++;
        events.push(new FileDiscoveredEvent(new FolderNodeId(folderId), path, true));
      } else {
        const fileId = existingIds?.get(path.value) ?? UuidGenerator.generate();
        const fileNode = new FileNode(
          new FileNodeId(fileId),
          path,
          meta.name,
          parentPath,
          new FileSize(meta.size),
          DateTime.fromISO(meta.lastModified.toISOString()),
          meta.hash ? Maybe.some(new FileHash(meta.hash)) : Maybe.none<FileHash>(),
          false
        );
        parent.addChild(fileNode);
        fileCount++;
        events.push(new FileDiscoveredEvent(new FileNodeId(fileId), path, false));
      }
    }

    const durationMs = Date.now() - startTime;
    events.push(new ScanCompletedEvent(rootPath.value, fileCount, folderCount, durationMs));

    return {
      rootFolder,
      events,
      fileCount,
      folderCount,
      durationMs
    };
  }

  private isIgnored(path: string, patterns: IgnorePattern[]): boolean {
    return patterns.some(pattern => pattern.matches(path));
  }
}