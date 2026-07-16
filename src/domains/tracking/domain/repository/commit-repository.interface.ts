import { GranularCommit } from '../entities/granular-commit';
import { CommitId } from '../value-objects/commit-id';

export interface ICommitRepository {
  findById(id: CommitId): Promise<GranularCommit | null>;
  save(commit: GranularCommit): Promise<void>;
  findAll(): Promise<GranularCommit[]>;
}