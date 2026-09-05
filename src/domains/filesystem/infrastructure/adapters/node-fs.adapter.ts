import { promises as fsPromises, existsSync } from 'fs';
import * as path from 'path';
import { IFileSystemAdapter, FileMetadata } from '../../application/ports/file-system-adapter.interface';

export class NodeFsAdapter implements IFileSystemAdapter {
  async readDir(dirPath: string): Promise<FileMetadata[]> {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    return Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const statInfo = await fsPromises.stat(fullPath);
        return {
          path: entry.name,
          name: entry.name,
          lastModified: statInfo.mtime,
          isDirectory: entry.isDirectory(),
        };
      })
    );
  }

  async readDirRecursively(dirPath: string): Promise<FileMetadata[]> {
    const results: FileMetadata[] = [];
    const stack: string[] = [dirPath];

    while (stack.length > 0) {
      const currentDir = stack.pop()!;
      let entries: import('fs').Dirent[];

      try {
        entries = await fsPromises.readdir(currentDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        const absolutePath = path.join(currentDir, entry.name);
        const relativePath = path.relative(dirPath, absolutePath).replace(/\\/g, '/');

        let statInfo;
        try {
          statInfo = await fsPromises.stat(absolutePath);
        } catch {
          continue;
        }

        results.push({
          path: relativePath,
          name: entry.name,
          lastModified: statInfo.mtime,
          isDirectory: entry.isDirectory(),
        });

        if (entry.isDirectory()) {
          stack.push(absolutePath);
        }
      }
    }
    return results;
  }

  async stat(filePath: string): Promise<FileMetadata> {
    const statInfo = await fsPromises.stat(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      lastModified: statInfo.mtime,
      isDirectory: statInfo.isDirectory(),
    };
  }

  exists(filePath: string): boolean {
    return existsSync(filePath);
  }

  async readFile(absolutePath: string): Promise<string> {
    const raw = await fsPromises.readFile(absolutePath, 'utf-8');
    return raw.replace(/\r\n|\r/g, '\n');
  }
}