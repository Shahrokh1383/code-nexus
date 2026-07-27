import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { GetFileTreeQuery } from '../queries/get-file-tree.query';
import { FileTreeDto } from '../dto/file-tree.dto';
import { FileNodeDto } from '../dto/file-node.dto';
import { FolderNodeDto } from '../dto/folder-node.dto';
import { IFileSystemRepository } from '../../domain/repository/filesystem-repository.interface';
import { FilePath } from '../../domain/value-objects/file-path';
import { FileNode } from '../../domain/entities/file-node';
import { FolderNode } from '../../domain/entities/folder-node';
import { IgnorePattern } from '../../domain/value-objects/ignore-pattern';

export class GetFileTreeHandler implements IQueryHandler<GetFileTreeQuery, FileTreeDto> {
  constructor(private readonly fileSystemRepo: IFileSystemRepository) {}

  async execute(query: GetFileTreeQuery): Promise<Result<FileTreeDto, string>> {
    try {
      const targetPath = query.parentPath ? new FilePath(query.parentPath) : new FilePath('.');

      const target = await this.fileSystemRepo.findByPath(targetPath);
      
      if (!target) {
        if (targetPath.value === '.') {
          return Result.ok({
            root: { id: 'root', path: '.', name: '.', children: [] },
            totalFiles: 0,
            totalFolders: 1,
          });
        }
        return Result.fail(`Folder not found at path: ${targetPath.value}`);
      }

      if (!(target instanceof FolderNode)) {
        return Result.fail(`Path is not a folder: ${targetPath.value}`);
      }

      // Build ignore matchers if patterns provided
      const ignorePatterns = (query.ignorePatterns ?? []).map(p => {
        try { return new IgnorePattern(p); } catch { return null; }
      }).filter((p): p is IgnorePattern => p !== null);

      const { dto, fileCount, folderCount } = await this.buildTreeDto(target, ignorePatterns);

      return Result.ok({
        root: dto,
        totalFiles: fileCount,
        totalFolders: folderCount,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get file tree';
      return Result.fail(message);
    }
  }

  private async buildTreeDto(
    folder: FolderNode,
    ignorePatterns: IgnorePattern[]
  ): Promise<{ dto: FolderNodeDto; fileCount: number; folderCount: number }> {
    const children = await this.fileSystemRepo.findChildrenOf(folder.path);
    const childDtos: Array<FileNodeDto | FolderNodeDto> = [];
    let fileCount = 0;
    let folderCount = 1;

    for (const child of children) {
      // Skip ignored children completely
      if (ignorePatterns.some(p => p.matches(child.path.value))) {
        continue;
      }

      if (child instanceof FileNode) {
        childDtos.push(this.mapFileToDto(child));
        fileCount++;
      } else {
        const { dto: childDto, fileCount: childFiles, folderCount: childFolders } =
          await this.buildTreeDto(child, ignorePatterns);
        childDtos.push(childDto);
        fileCount += childFiles;
        folderCount += childFolders;
      }
    }

    return {
      dto: {
        id: folder.id.value,
        path: folder.path.value,
        name: folder.name,
        children: childDtos,
      },
      fileCount,
      folderCount,
    };
  }

  private mapFileToDto(node: FileNode): FileNodeDto {
    return {
      id: node.id.value,
      path: node.path.value,
      name: node.name,
      lastModified: node.lastModified.toISO(),
      isDirectory: false,
    };
  }
}