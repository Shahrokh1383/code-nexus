import { promises as fs, Dirent } from 'fs';
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

  async scanWorkspaceForCandidates(
    ignorePatterns: string[]
  ): Promise<Array<{ path: string; files: Array<{ name: string; path: string; isDirectory: boolean }> }>> {
    const candidates: Array<{ path: string; files: Array<{ name: string; path: string; isDirectory: boolean }> }> = [];

    const isIgnored = (relativePath: string, isDir: boolean) => {
      const pathWithSlash = isDir ? relativePath + '/' : relativePath;
      for (const pattern of ignorePatterns) {
        const cleanPattern = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;
        if (relativePath === cleanPattern) return true;
        if (pathWithSlash.startsWith(cleanPattern + '/')) return true;
        if (pathWithSlash.includes('/' + cleanPattern + '/')) return true;
        if (cleanPattern.includes('*')) {
          const regex = new RegExp('^' + cleanPattern.replace(/\*/g, '.*') + '$');
          if (regex.test(relativePath)) return true;
        }
      }
      return false;
    };

    const traverse = async (relativePath: string): Promise<Array<{ name: string; path: string; isDirectory: boolean }>> => {
      const absolutePath = this.resolve(relativePath);
      let entries: Dirent[];
      try {
        entries = await fs.readdir(absolutePath, { withFileTypes: true });
      } catch {
        return [];
      }

      const filesInThisFolder: Array<{ name: string; path: string; isDirectory: boolean }> = [];

      for (const entry of entries) {
        const entryRelativePath = relativePath === '.' ? entry.name : PathUtils.join(relativePath, entry.name);
        
        if (isIgnored(entryRelativePath, entry.isDirectory())) {
          continue;
        }

        const node = { name: entry.name, path: entryRelativePath, isDirectory: entry.isDirectory() };
        filesInThisFolder.push(node);

        if (entry.isDirectory()) {
          const nestedFiles = await traverse(entryRelativePath);
          candidates.push({ path: entryRelativePath, files: [node, ...nestedFiles] });
        }
      }
      return filesInThisFolder;
    };

    await traverse('.');
    return candidates;
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