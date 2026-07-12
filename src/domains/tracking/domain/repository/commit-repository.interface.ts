import { GranularCommit } from '../entities/granular-commit';
import { CommitId } from '../value-objects/commit-id';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';

export interface ICommitRepository {
  findById(id: CommitId): Promise<GranularCommit | null>;
  findByDocument(documentId: DocumentId): Promise<GranularCommit[]>;
  save(commit: GranularCommit): Promise<void>;
  findAll(): Promise<GranularCommit[]>;
}