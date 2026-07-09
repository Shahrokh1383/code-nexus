import { IFileSystemRepository } from '../../domain/repository/filesystem-repository.interface';
import { FileNode } from '../../domain/entities/file-node';
import { FolderNode } from '../../domain/entities/folder-node';
import { FileNodeId } from '../../domain/value-objects/file-node-id';
import { FolderNodeId } from '../../domain/value-objects/folder-node-id';
import { FilePath } from '../../domain/value-objects/file-path';
import { FileSize } from '../../domain/value-objects/file-size';
import { FileHash } from '../../domain/value-objects/file-hash';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { Maybe } from '../../../shared-kernel/types/maybe';
import { Identifier } from '../../../shared-kernel/types/identifier';
import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { FileIndexSchema } from '../../../../infrastructure/persistence/database-schema';

export class FileSystemJsonRepository implements IFileSystemRepository {
  private readonly filename = 'file-index.json';

  constructor(private readonly db: JsonDatabase) {}

  async findById(id: Identifier): Promise<FileNode | FolderNode | null> {
    const index = await this.readIndex();
    for (const [path, entry] of Object.entries(index.files)) {
      if (entry.id === id.value) {
        return this.mapEntryToNode(path, entry);
      }
    }
    return null;
  }

  async findByPath(path: FilePath): Promise<FileNode | FolderNode | null> {
    const index = await this.readIndex();
    const entry = index.files[path.value];
    if (!entry) {
      return null;
    }
    return this.mapEntryToNode(path.value, entry);
  }

  async save(entity: FileNode | FolderNode): Promise<void> {
    const index = await this.readIndex();

    const hash = entity instanceof FileNode ? entity.hash.getOrNull()?.value ?? null : null;
    const size = entity instanceof FileNode ? entity.size.bytes : 0;
    const lastModified = entity instanceof FileNode
      ? entity.lastModified.toISO()
      : DateTime.now().toISO();

    index.files[entity.path.value] = {
      id: entity.id.value,
      hash,
      lastModified,
      size,
      isDirectory: entity instanceof FolderNode,
    };

    await this.writeIndex(index);
  }

  async delete(id: Identifier): Promise<void> {
    const index = await this.readIndex();
    for (const [path, entry] of Object.entries(index.files)) {
      if (entry.id === id.value) {
        delete index.files[path];
        await this.writeIndex(index);
        return;
      }
    }
  }

  async exists(id: Identifier): Promise<boolean> {
    const found = await this.findById(id);
    return found !== null;
  }

  async findAll(): Promise<Array<FileNode | FolderNode>> {
    const index = await this.readIndex();
    return Object.entries(index.files).map(([path, entry]) => this.mapEntryToNode(path, entry));
  }

  async findChildrenOf(parentPath: FilePath): Promise<Array<FileNode | FolderNode>> {
    const index = await this.readIndex();
    const prefix = parentPath.value === '.' ? '' : parentPath.value + '/';
    const children: Array<FileNode | FolderNode> = [];

    for (const [path, entry] of Object.entries(index.files)) {
      if (prefix === '') {
        if (!path.includes('/') && path !== '.') {
          children.push(this.mapEntryToNode(path, entry));
        }
      } else {
        if (path.startsWith(prefix) && !path.slice(prefix.length).includes('/')) {
          children.push(this.mapEntryToNode(path, entry));
        }
      }
    }

    return children;
  }

  async findByPattern(pattern: string): Promise<FileNode[]> {
    const index = await this.readIndex();
    const results: FileNode[] = [];

    for (const [path, entry] of Object.entries(index.files)) {
      if (entry.isDirectory) continue;
      if (path.includes(pattern)) {
        const node = this.mapEntryToNode(path, entry);
        if (node instanceof FileNode) {
          results.push(node);
        }
      }
    }

    return results;
  }

  private async readIndex(): Promise<FileIndexSchema> {
    try {
      return await this.db.read<FileIndexSchema>(this.filename);
    } catch {
      return { version: '1.0', lastScan: null, files: {} };
    }
  }

  private async writeIndex(index: FileIndexSchema): Promise<void> {
    await this.db.write(this.filename, index);
  }

  private mapEntryToNode(path: string, entry: FileIndexSchema['files'][string]): FileNode | FolderNode {
    const filePath = new FilePath(path);

    if (entry.isDirectory) {
      return new FolderNode(
        new FolderNodeId(entry.id),
        filePath,
        filePath.getName()
      );
    }

    return new FileNode(
      new FileNodeId(entry.id),
      filePath,
      filePath.getName(),
      filePath.getParentPath(),
      new FileSize(entry.size),
      DateTime.fromISO(entry.lastModified),
      entry.hash ? Maybe.some(new FileHash(entry.hash)) : Maybe.none<FileHash>(),
      false
    );
  }
}