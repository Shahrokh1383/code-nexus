import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { CommitId } from '../value-objects/commit-id';
import { FileHash } from '../entities/file-hash';
import { GranularCommit } from '../entities/granular-commit';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';

export interface ITrackingRepository {
  findHashByPath(filePath: FilePath): Promise<FileHash | null>;
  saveHash(fileHash: FileHash): Promise<void>;
  findCommitById(commitId: CommitId): Promise<GranularCommit | null>;
  saveCommit(commit: GranularCommit): Promise<void>;
  findPendingCommits(): Promise<GranularCommit[]>;
  findCommitsByDocument(documentId: DocumentId): Promise<GranularCommit[]>;
}