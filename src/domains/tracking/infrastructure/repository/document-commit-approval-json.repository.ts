import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../infrastructure/persistence/migration/schema-migrator';
import { IDocumentCommitApprovalRepository } from '../../domain/repository/document-commit-approval-repository.interface';
import { DocumentCommitApproval } from '../../domain/entities/document-commit-approval';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { CommitId } from '../../domain/value-objects/commit-id';
import { DateTime } from '../../../shared-kernel/types/date-time';

interface ApprovalEntry {
  commitId: string;
  approvedAt: string;
}

interface ApprovalsSchema {
  version: string;
  approvals: Record<string, ApprovalEntry[]>; // key: documentId
}

const APPROVALS_FILE = 'document-commit-approvals.json';
const SCHEMA_VERSION = '1.0';

export class DocumentCommitApprovalJsonRepository implements IDocumentCommitApprovalRepository {
  private readonly db: JsonDatabase;
  private readonly migrator: SchemaMigrator;

  constructor(workspaceRoot: string) {
    this.db = new JsonDatabase(workspaceRoot);
    this.migrator = new SchemaMigrator(SCHEMA_VERSION);
  }

  async findByDocument(documentId: DocumentId): Promise<DocumentCommitApproval[]> {
    const index = await this.readIndex();
    const entries = index.approvals[documentId.value] ?? [];
    return entries.map(e => new DocumentCommitApproval(
      documentId,
      new CommitId(e.commitId),
      DateTime.fromISO(e.approvedAt)
    ));
  }

  async save(approval: DocumentCommitApproval): Promise<void> {
    const index = await this.readIndex();
    const key = approval.documentId.value;
    if (!index.approvals[key]) {
      index.approvals[key] = [];
    }
    index.approvals[key].push({
      commitId: approval.commitId.value,
      approvedAt: approval.approvedAt.toISO()
    });
    await this.writeIndex(index);
  }

  private async readIndex(): Promise<ApprovalsSchema> {
    try {
      const data = await this.db.read<ApprovalsSchema>(APPROVALS_FILE);
      const migrated = this.migrator.migrate(data as unknown as Record<string, unknown>);
      return migrated as unknown as ApprovalsSchema;
    } catch (error) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { version: SCHEMA_VERSION, approvals: {} };
      }
      throw error;
    }
  }

  private async writeIndex(index: ApprovalsSchema): Promise<void> {
    await this.db.write(APPROVALS_FILE, index);
  }
}