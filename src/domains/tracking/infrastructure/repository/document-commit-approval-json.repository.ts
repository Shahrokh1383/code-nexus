import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../infrastructure/persistence/migration/schema-migrator';
import { IDocumentCommitApprovalRepository } from '../../domain/repository/document-commit-approval-repository.interface';
import { DocumentCommitApproval } from '../../domain/entities/document-commit-approval';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { CommitId } from '../../domain/value-objects/commit-id';
import { DateTime } from '../../../shared-kernel/types/date-time';

interface ApprovalEntry { commitId: string; approvedAt: string; }
interface ApprovalsSchema { version: string; approvals: Record<string, ApprovalEntry[]>; }

const APPROVALS_FILE = 'document-commit-approvals.json';
const SCHEMA_VERSION = '1.0';

export class DocumentCommitApprovalJsonRepository implements IDocumentCommitApprovalRepository {
  private readonly db: JsonDatabase;
  private readonly migrator: SchemaMigrator;
  private cache: ApprovalsSchema | null = null;
  private writeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_DELAY_MS = 300;

  constructor(workspaceRoot: string) {
    this.db = new JsonDatabase(workspaceRoot);
    this.migrator = new SchemaMigrator(SCHEMA_VERSION);
  }

  async findByDocument(documentId: DocumentId): Promise<DocumentCommitApproval[]> {
    const index = await this.readIndex();
    const entries = index.approvals[documentId.value] ?? [];
    return entries.map(e => new DocumentCommitApproval(
      documentId, new CommitId(e.commitId), DateTime.fromISO(e.approvedAt)
    ));
  }

  async save(approval: DocumentCommitApproval): Promise<void> {
    const index = await this.readIndex();
    const key = approval.documentId.value;
    if (!index.approvals[key]) index.approvals[key] = [];
    index.approvals[key].push({ commitId: approval.commitId.value, approvedAt: approval.approvedAt.toISO() });
    this.scheduleWrite();
  }

  private async readIndex(): Promise<ApprovalsSchema> {
    if (this.cache) return this.cache;
    try {
      const data = await this.db.read<ApprovalsSchema>(APPROVALS_FILE);
      const migrated = this.migrator.migrate(data as unknown as Record<string, unknown>);
      this.cache = migrated as unknown as ApprovalsSchema;
    } catch (error) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.cache = { version: SCHEMA_VERSION, approvals: {} };
      } else {
        throw error;
      }
    }
    return this.cache!;
  }

  private scheduleWrite(): void {
    if (this.writeDebounceTimer) clearTimeout(this.writeDebounceTimer);
    this.writeDebounceTimer = setTimeout(async () => {
      if (this.cache) await this.db.write(APPROVALS_FILE, this.cache);
      this.writeDebounceTimer = null;
    }, this.DEBOUNCE_DELAY_MS);
  }
}