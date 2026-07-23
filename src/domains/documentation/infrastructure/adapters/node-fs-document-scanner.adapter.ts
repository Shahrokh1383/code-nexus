import { promises as fs } from 'fs';
import * as path from 'path';
import { PathUtils } from '../../../shared-kernel/utils/path-utils';
import { IDocumentFolderScannerPort } from '../../application/ports/document-folder-scanner-port.interface';

export class NodeFsDocumentScannerAdapter implements IDocumentFolderScannerPort {
  constructor(private readonly workspaceRoot: string) {}

  async exists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async isDirectory(relativePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(this.resolve(relativePath));
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  async listDirectories(relativePath: string): Promise<string[]> {
    try {
      const absolutePath = this.resolve(relativePath);
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch {
      return [];
    }
  }

  async scanFolder(
    relativePath: string
  ): Promise<
    Array<{ name: string; path: string; isDirectory: boolean; lastModified: Date }>
  > {
    const results: Array<{
      name: string;
      path: string;
      isDirectory: boolean;
      lastModified: Date;
    }> = [];

    await this.scanRecursive(relativePath, '', results);
    return results;
  }

  private async scanRecursive(
    folderRelativePath: string,
    prefix: string,
    results: Array<{ name: string; path: string; isDirectory: boolean; lastModified: Date }>
  ): Promise<void> {
    const absolutePath = this.resolve(
      prefix ? PathUtils.join(folderRelativePath, prefix) : folderRelativePath
    );

    try {
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });

      for (const entry of entries) {
        const entryRelativePath = prefix
          ? PathUtils.join(prefix, entry.name)
          : entry.name;

        const entryAbsolutePath = path.join(absolutePath, entry.name);
        const stat = await fs.stat(entryAbsolutePath);

        results.push({
          name: entry.name,
          path: entryRelativePath,
          isDirectory: entry.isDirectory(),
          lastModified: stat.mtime,
        });

        if (entry.isDirectory()) {
          await this.scanRecursive(folderRelativePath, entryRelativePath, results);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`[Scanner] Error reading directory ${absolutePath}:`, error);
      }
    }
  }

  private resolve(relativePath: string): string {
    const joined = path.join(this.workspaceRoot, PathUtils.normalize(relativePath));
    return joined.replace(/\\/g, '/');
  }
}