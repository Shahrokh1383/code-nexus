import { FileHash } from '../entities/file-hash';
import { TrackedFilePath } from '../value-objects/tracked-file-path';

export interface IHashRepository {
  findHashByPath(filePath: TrackedFilePath): Promise<FileHash | null>;
  findAllHashes(): Promise<FileHash[]>;
  saveHash(fileHash: FileHash): Promise<void>;
  updatePendingStatus(filePath: TrackedFilePath, isPending: boolean, committedHash?: string): Promise<void>;
  deleteHashByPath(filePath: TrackedFilePath): Promise<void>;
  deleteAllExcept(filePaths: Set<string>): Promise<void>;
}