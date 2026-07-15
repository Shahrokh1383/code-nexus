import { FileHash } from '../entities/file-hash';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { ContentDiffDto } from '../../application/dto/content-diff.dto';

export interface IHashRepository {
  findHashByPath(filePath: FilePath): Promise<FileHash | null>;
  findAllHashes(): Promise<FileHash[]>;
  saveHash(fileHash: FileHash, diff?: ContentDiffDto | null): Promise<void>;
  findDiffByPath(filePath: FilePath): Promise<ContentDiffDto | null>;
  deleteHashByPath(filePath: FilePath): Promise<void>;
  deleteAllExcept(filePaths: Set<string>): Promise<void>;
}