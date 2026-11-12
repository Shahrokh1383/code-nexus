import { join } from 'path';
import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import { CommitId, GranularCommit } from '../domain/GranularCommit';
import { FileHash, FileHashId, HashValue } from '../domain/FileHash';
import { TrackedFilePath } from '../domain/TrackedFilePath';

interface CommitEntrySchema {
  id: string;
  fileHashes: { id: string; filePath: string; hashValue: string }[];
  committedAt: string;
}

interface CommitsIndexSchema {
  version: string;
  commits: CommitEntrySchema[];
}

const COMMITS_INDEX_FILENAME = 'commits.json';
const SCHEMA_VERSION = '1.1';
const DEBOUNCE_DELAY_MS = 300;

export class CommitsJsonRepository {
  private readonly caches = new Map<string, CommitsIndexSchema>();
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly files: AtomicJsonFile) {}

  async findById(rootPath: string, id: CommitId): Promise<GranularCommit | null> {
    const index = await this.readIndex(rootPath);
    const entry = index.commits.find((c) => c.id === id.value);
    return entry ? this.toEntity(entry) : null;
  }

  async save(rootPath: string, commit: GranularCommit): Promise<void> {
    const index = await this.readIndex(rootPath);
    const existingIdx = index.commits.findIndex((c) => c.id === commit.id.value);
    const entry = this.toEntry(commit);
    if (existingIdx >= 0) index.commits[existingIdx] = entry;
    else index.commits.push(entry);
    this.scheduleWrite(rootPath);
  }

  async findAll(rootPath: string): Promise<GranularCommit[]> {
    const index = await this.readIndex(rootPath);
    return index.commits.map((e) => this.toEntity(e));
  }

  async flush(rootPath: string): Promise<void> {
    const timer = this.debounceTimers.get(rootPath);
    if (timer) { clearTimeout(timer); this.debounceTimers.delete(rootPath); }
    const cache = this.caches.get(rootPath);
    if (cache) await this.files.writeJson(this.indexPath(rootPath), cache);
  }

  /** See TrackingJsonRepository.indexPath — .doclink is the metadata boundary. */
  private indexPath(rootPath: string): string {
    return join(rootPath, '.doclink', COMMITS_INDEX_FILENAME);
  }

  private async readIndex(rootPath: string): Promise<CommitsIndexSchema> {
    const cached = this.caches.get(rootPath);
    if (cached) return cached;

    let index: CommitsIndexSchema;
    try {
      index = await this.files.readJson<CommitsIndexSchema>(this.indexPath(rootPath));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') index = { version: SCHEMA_VERSION, commits: [] };
      else throw error;
    }
    this.caches.set(rootPath, index);
    return index;
  }

  private scheduleWrite(rootPath: string): void {
    const existing = this.debounceTimers.get(rootPath);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(rootPath);
      const cache = this.caches.get(rootPath);
      if (cache) await this.files.writeJson(this.indexPath(rootPath), cache);
    }, DEBOUNCE_DELAY_MS);
    this.debounceTimers.set(rootPath, timer);
  }

  private toEntity(entry: CommitEntrySchema): GranularCommit {
    const fileHashes = entry.fileHashes.map(
      (fh) => new FileHash(
        new FileHashId(fh.id),
        new TrackedFilePath(fh.filePath),
        new HashValue(fh.hashValue),
      ),
    );
    return new GranularCommit(new CommitId(entry.id), fileHashes, new Date(entry.committedAt));
  }

  private toEntry(commit: GranularCommit): CommitEntrySchema {
    return {
      id: commit.id.value,
      fileHashes: commit.fileHashes.map((fh) => ({
        id: fh.id.value,
        filePath: fh.filePath.value,
        hashValue: fh.hashValue.value,
      })),
      committedAt: commit.committedAt.toISOString(),
    };
  }
}