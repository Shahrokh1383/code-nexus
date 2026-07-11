import { FileHash } from '../entities/file-hash';
import { GranularCommit } from '../entities/granular-commit';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { CommitId } from '../value-objects/commit-id';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { ContentDiffDto } from '../../application/dto/content-diff.dto';

export interface ITrackingRepository {
  findHashByPath(filePath: FilePath): Promise<FileHash | null>;
  findAllHashes(): Promise<FileHash[]>;
  saveHash(fileHash: FileHash, diff?: ContentDiffDto | null): Promise<void>;
  findDiffByPath(filePath: FilePath): Promise<ContentDiffDto | null>;
  
  findCommitById(commitId: CommitId): Promise<GranularCommit | null>;
  saveCommit(commit: GranularCommit): Promise<void>;
  findPendingCommits(): Promise<GranularCommit[]>;
  findCommitsByDocument(documentId: DocumentId): Promise<GranularCommit[]>;
}