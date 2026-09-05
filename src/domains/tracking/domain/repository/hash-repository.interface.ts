import { FileHash } from '../entities/file-hash';
import { TrackedFilePath } from '../value-objects/tracked-file-path';
import { ContentDiffDto } from '../../application/dto/content-diff.dto';

export interface IHashRepository {
  findHashByPath(filePath: TrackedFilePath): Promise<FileHash | null>;
  findAllHashes(): Promise<FileHash[]>;
  saveHash(fileHash: FileHash, diff?: ContentDiffDto | null): Promise<void>;
  findDiffByPath(filePath: TrackedFilePath): Promise<ContentDiffDto | null>;
  deleteHashByPath(filePath: TrackedFilePath): Promise<void>;
  deleteAllExcept(filePaths: Set<string>): Promise<void>;
}