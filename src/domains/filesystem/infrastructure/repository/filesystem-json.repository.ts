import { IFileSystemRepository } from '../../domain/repository/filesystem-repository.interface';
import { FileNode } from '../../domain/entities/file-node';
import { FolderNode } from '../../domain/entities/folder-node';
import { FileNodeId } from '../../domain/value-objects/file-node-id';
import { FolderNodeId } from '../../domain/value-objects/folder-node-id';
import { FilePath } from '../../domain/value-objects/file-path';
import { FileHash } from '../../domain/value-objects/file-hash';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { Maybe } from '../../../shared-kernel/types/maybe';
import { Identifier } from '../../../shared-kernel/types/identifier';
import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { FileIndexSchema } from '../../../../infrastructure/persistence/database-schema';

export class FileSystemJsonRepository implements IFileSystemRepository {
  private readonly filename = 'file-index.json';
  private cache: FileIndexSchema | null = null;
  private writeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_DELAY_MS = 300;

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
    if (!entry) return null;
    return this.mapEntryToNode(path.value, entry);
  }

  async save(entity: FileNode | FolderNode): Promise<void> {
    const index = await this.readIndex();

    const hash = entity instanceof FileNode ? entity.hash.getOrNull()?.value ?? null : null;
    const lastModified = entity instanceof FileNode
      ? entity.lastModified.toISO()
      : DateTime.now().toISO();

    index.files[entity.path.value] = {
      id: entity.id.value,
      hash,
      lastModified,
      isDirectory: entity instanceof FolderNode,
    };

    this.scheduleWrite();
  }

  async delete(id: Identifier): Promise<void> {
    const index = await this.readIndex();
    for (const [path, entry] of Object.entries(index.files)) {
      if (entry.id === id.value) {
        delete index.files[path];
        this.scheduleWrite();
        return;
      }
    }
  }

  async deleteByPath(path: FilePath): Promise<void> {
    const index = await this.readIndex();
    const prefix = path.value + '/';
    let changed = false;

    // Delete the exact path
    if (index.files[path.value]) {
      delete index.files[path.value];
      changed = true;
    }

    // Delete all nested children recursively to prevent ghost files
    for (const entryPath of Object.keys(index.files)) {
      if (entryPath.startsWith(prefix)) {
        delete index.files[entryPath];
        changed = true;
      }
    }

    if (changed) {
      this.scheduleWrite();
    }
  }

  async exists(id: Identifier): Promise<boolean> {
    return (await this.findById(id)) !== null;
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
        if (node instanceof FileNode) results.push(node);
      }
    }
    return results;
  }

  async clear(): Promise<void> {
    this.cache = { version: '1.0', lastScan: null, files: {} };
    this.scheduleWrite();
  }

  async clearAndSaveAll(root: FolderNode): Promise<void> {
    const files: FileIndexSchema['files'] = {};
    const stack: Array<FileNode | FolderNode> = [root];
    
    while (stack.length > 0) {
      const node = stack.pop()!;
      const hash = node instanceof FileNode ? node.hash.getOrNull()?.value ?? null : null;
      const lastModified = node instanceof FileNode
        ? node.lastModified.toISO()
        : DateTime.now().toISO();

      files[node.path.value] = {
        id: node.id.value,
        hash,
        lastModified,
        isDirectory: node instanceof FolderNode,
      };

      if (node instanceof FolderNode) {
        for (const child of node.children) stack.push(child);
      }
    }

    this.cache = {
      version: '1.0',
      lastScan: new Date().toISOString(),
      files,
    };
    this.scheduleWrite();
  }

  async flush(): Promise<void> {
    if (this.writeDebounceTimer) {
      clearTimeout(this.writeDebounceTimer);
      this.writeDebounceTimer = null;
    }
    if (this.cache) {
      await this.db.write(this.filename, this.cache);
    }
  }

  private async readIndex(): Promise<FileIndexSchema> {
    if (this.cache) return this.cache;
    try {
      this.cache = await this.db.read<FileIndexSchema>(this.filename);
    } catch {
      this.cache = { version: '1.0', lastScan: null, files: {} };
    }
    return this.cache;
  }

  private scheduleWrite(): void {
    if (this.writeDebounceTimer) {
      clearTimeout(this.writeDebounceTimer);
    }
    
    this.writeDebounceTimer = setTimeout(async () => {
      if (this.cache) {
        await this.db.write(this.filename, this.cache);
      }
      this.writeDebounceTimer = null;
    }, this.DEBOUNCE_DELAY_MS);
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
      DateTime.fromISO(entry.lastModified),
      entry.hash ? Maybe.some(new FileHash(entry.hash)) : Maybe.none<FileHash>(),
      false
    );
  }
}