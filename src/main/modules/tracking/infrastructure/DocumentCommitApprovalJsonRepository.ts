import { join } from 'path';
import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import { DocumentCommitApproval } from '../domain/DocumentCommitApproval';
import { CommitId } from '../domain/GranularCommit';

interface ApprovalEntry { commitId: string; approvedAt: string }
interface ApprovalsSchema { version: string; approvals: Record<string, ApprovalEntry[]> }

const APPROVALS_FILENAME = 'document-commit-approvals.json';
const SCHEMA_VERSION = '1.0';
const DEBOUNCE_DELAY_MS = 300;

export class DocumentCommitApprovalJsonRepository {
  private readonly caches = new Map<string, ApprovalsSchema>();
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly files: AtomicJsonFile) {}

  async findByDocument(rootPath: string, documentId: { value: string }): Promise<DocumentCommitApproval[]> {
    const index = await this.readIndex(rootPath);
    const entries = index.approvals[documentId.value] ?? [];
    return entries.map((e) => new DocumentCommitApproval(
      documentId,
      new CommitId(e.commitId),
      new Date(e.approvedAt),
    ));
  }

  async save(rootPath: string, approval: DocumentCommitApproval): Promise<void> {
    const index = await this.readIndex(rootPath);
    const key = approval.documentId.value;
    if (!index.approvals[key]) index.approvals[key] = [];
    index.approvals[key].push({
      commitId: approval.commitId.value,
      approvedAt: approval.approvedAt.toISOString(),
    });
    this.scheduleWrite(rootPath);
  }

  async flush(rootPath: string): Promise<void> {
    const timer = this.debounceTimers.get(rootPath);
    if (timer) { clearTimeout(timer); this.debounceTimers.delete(rootPath); }
    const cache = this.caches.get(rootPath);
    if (cache) await this.files.writeJson(this.indexPath(rootPath), cache);
  }

  /** See TrackingJsonRepository.indexPath — .doclink is the metadata boundary. */
  private indexPath(rootPath: string): string {
    return join(rootPath, '.doclink', APPROVALS_FILENAME);
  }

  private async readIndex(rootPath: string): Promise<ApprovalsSchema> {
    const cached = this.caches.get(rootPath);
    if (cached) return cached;

    let index: ApprovalsSchema;
    try {
      index = await this.files.readJson<ApprovalsSchema>(this.indexPath(rootPath));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') index = { version: SCHEMA_VERSION, approvals: {} };
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
}