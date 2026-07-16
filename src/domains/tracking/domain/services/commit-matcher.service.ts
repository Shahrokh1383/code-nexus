import { ICommitRepository } from '../repository/commit-repository.interface';
import { GranularCommit } from '../entities/granular-commit';
import { HashValue } from '../value-objects/hash-value';

export class CommitMatcherService {
  async findMatchingCommit(
    currentState: Map<string, HashValue>,
    commitRepo: ICommitRepository
  ): Promise<GranularCommit | null> {
    const allCommits = await commitRepo.findAll();
    for (const commit of allCommits) {
      if (commit.fileHashes.length !== currentState.size) continue;
      const matches = commit.fileHashes.every(fh => {
        const currentHash = currentState.get(fh.filePath.value);
        return currentHash !== undefined && currentHash.equals(fh.hashValue);
      });
      if (matches) return commit;
    }
    return null;
  }
}