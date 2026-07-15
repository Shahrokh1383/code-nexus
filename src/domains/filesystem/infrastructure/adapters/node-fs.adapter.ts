import { promises as fsPromises, existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IFileSystemAdapter } from '../../application/ports/file-system-adapter.interface';
import { FileMetadata } from '../../domain/services/scan-project.service';

export class NodeFsAdapter implements IFileSystemAdapter {
  async scanDirectory(rootPath: string): Promise<FileMetadata[]> {
    const results: FileMetadata[] = [];
    const dirQueue: string[] = [rootPath];
    const concurrency = Math.max(1, os.cpus().length - 1);
    const workers: Promise<void>[] = [];

    const processDirectory = async (absoluteDir: string): Promise<void> => {
      const entries = await fsPromises.readdir(absoluteDir, { withFileTypes: true });
      const childDirs: string[] = [];

      for (const entry of entries) {
        const absolutePath = path.join(absoluteDir, entry.name);
        const relativePath = path.relative(rootPath, absolutePath).replace(/\\/g, '/');
        const statInfo = await fsPromises.stat(absolutePath);

        results.push({
          path: relativePath,
          name: entry.name,
          size: statInfo.size,
          lastModified: statInfo.mtime,
          isDirectory: entry.isDirectory(),
        });

        if (entry.isDirectory()) {
          childDirs.push(absolutePath);
        }
      }

      // Add subdirectories to queue and process them with limited concurrency
      for (const subDir of childDirs) {
        dirQueue.push(subDir);
      }
    };

    // Worker that processes directories until queue is empty
    const worker = async (): Promise<void> => {
      while (dirQueue.length > 0) {
        const dir = dirQueue.shift();
        if (dir) {
          await processDirectory(dir);
        }
      }
    };

    // Start concurrent workers
    for (let i = 0; i < concurrency; i++) {
      workers.push(worker());
    }

    await Promise.all(workers);
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
}