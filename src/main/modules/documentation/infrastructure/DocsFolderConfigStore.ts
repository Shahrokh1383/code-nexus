import { DomainException } from '../../../shared/errors/domain-exception';
import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import { doclinkFilePath } from './doclink-path';
import { DocFolder } from '../domain/DocFolder';
import { DocFolderSignature } from '../domain/DocFolderSignature';

interface DocFolderSignatureSchema {
  fileCount: number;
  topLevelFileNames: string[];
  directoryDepth: number;
}

interface DocFolderSchema {
  id: string;
  path: string;
  signature: DocFolderSignatureSchema;
  documentCount: number;
}

type ConfigRaw = Record<string, unknown> & {
  docFolder?: DocFolderSchema | null;
  docsFolderPath?: string | null;
};

/**
 * `.doclink/config.json` access for the keys owned by this module
 * (`docFolder`, `docsFolderPath`). Read-modify-write cycles run under a
 * per-root queue so concurrent module operations cannot interleave.
 * All other keys (workspaceId, ignorePatterns, schemaVersion, …) are
 * round-tripped untouched — the workspace module owns those.
 */
export class DocsFolderConfigStore {
  private readonly filename = 'config.json';
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(private readonly file: AtomicJsonFile) {}

  /** Used by register — legacy failed with this exact message when absent. */
  async requireConfig(rootPath: string): Promise<ConfigRaw> {
    const raw = await this.readRaw(rootPath);
    if (!raw) {
      throw new DomainException('PROJECT_CONFIG_NOT_FOUND', 'Project configuration not found');
    }
    return raw;
  }

  async readDocsFolderPath(rootPath: string): Promise<string | null> {
    const raw = await this.readRaw(rootPath);
    if (!raw) return null;
    return typeof raw.docsFolderPath === 'string' ? raw.docsFolderPath : null;
  }

  async readDocFolder(rootPath: string): Promise<DocFolder | null> {
    const raw = await this.readRaw(rootPath);
    const block = raw?.docFolder;
    if (!block) return null;
    try {
      return new DocFolder(
        block.id,
        block.path,
        new DocFolderSignature(
          block.signature.fileCount,
          block.signature.topLevelFileNames,
          block.signature.directoryDepth
        ),
        block.documentCount
      );
    } catch {
      // Corrupt block behaves as "not registered" — legacy repository
      // caught mapping failures the same way.
      return null;
    }
  }

  /**
   * Persists the folder block and points `docsFolderPath` at it in a single
   * RMW cycle — the end state of the legacy two-step save, with fewer
   * interleavings.
   */
  async saveDocFolder(rootPath: string, folder: DocFolder): Promise<void> {
    await this.enqueue(rootPath, async () => {
      const raw = await this.readRaw(rootPath);
      if (!raw) {
        throw new DomainException('CONFIG_FILE_MISSING', 'config.json does not exist');
      }
      raw.docFolder = {
        id: folder.id,
        path: folder.path,
        signature: {
          fileCount: folder.signature.fileCount,
          topLevelFileNames: folder.signature.topLevelFileNames,
          directoryDepth: folder.signature.directoryDepth,
        },
        documentCount: folder.documentCount,
      };
      raw.docsFolderPath = folder.path;
      await this.file.writeJson(doclinkFilePath(rootPath, this.filename), raw);
    });
  }

  private async readRaw(rootPath: string): Promise<ConfigRaw | null> {
    try {
      return await this.file.readJson<ConfigRaw>(doclinkFilePath(rootPath, this.filename));
    } catch {
      // Missing, empty or unrepairable config — legacy repositories treated
      // every read failure as "no config".
      return null;
    }
  }

  private async enqueue<T>(rootPath: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(rootPath) ?? Promise.resolve();
    const next = previous.then(operation, operation);
    this.queues.set(rootPath, next.catch(() => undefined));
    return next;
  }
}