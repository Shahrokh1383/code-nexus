import { promises as fsPromises, existsSync } from 'fs';
import * as path from 'path';
import { IFileSystemAdapter } from '../../application/ports/file-system-adapter.interface';
import { FileMetadata } from '../../domain/services/scan-project.service';

export class NodeFsAdapter implements IFileSystemAdapter {
  async scanDirectory(rootPath: string): Promise<FileMetadata[]> {
    const results: FileMetadata[] = [];
    await this.scanRecursive(rootPath, '', results);
    return results;
  }

  async readDir(dirPath: string): Promise<FileMetadata[]> {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    return Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const statInfo = await fsPromises.stat(fullPath);
        return {
          path: entry.name,
          name: entry.name,
          size: statInfo.size,
          lastModified: statInfo.mtime,
          isDirectory: entry.isDirectory(),
        };
      })
    );
  }

  async stat(filePath: string): Promise<FileMetadata> {
    const statInfo = await fsPromises.stat(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      size: statInfo.size,
      lastModified: statInfo.mtime,
      isDirectory: statInfo.isDirectory(),
    };
  }

  exists(filePath: string): boolean {
    return existsSync(filePath);
  }

  private async scanRecursive(
    absoluteRoot: string,
    relativePrefix: string,
    results: FileMetadata[]
  ): Promise<void> {
    const absolutePath = relativePrefix
      ? path.join(absoluteRoot, relativePrefix)
      : absoluteRoot;

    const children = await this.readDir(absolutePath);

    for (const child of children) {
      const childRelativePath = relativePrefix
        ? `${relativePrefix}/${child.path}`
        : child.path;

      results.push({
        ...child,
        path: childRelativePath,
      });

      if (child.isDirectory) {
        await this.scanRecursive(absoluteRoot, childRelativePath, results);
      }
    }
  }
}