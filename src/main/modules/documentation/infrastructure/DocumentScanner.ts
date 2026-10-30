import { promises as fs } from 'fs';
import type { Dirent } from 'fs';
import * as path from 'path';
import type { Logger } from '../../../shared/logger/logger';
import { PathUtils } from '../../../shared/utils/path-utils';

export interface ScannedFileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  lastModified: string;
}

export interface ScannedCandidate {
  path: string;
  files: Array<{ name: string; path: string; isDirectory: boolean }>;
}

/**
 * Node FS scanner for the documentation module. All paths are workspace
 * relative and resolved against the given root. Ports the legacy adapter
 * verbatim, including the ignore-pattern matching used for candidate scans.
 */
export class DocumentScanner {
  constructor(private readonly logger: Logger) {}

  async exists(rootPath: string, relativePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(rootPath, relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async isDirectory(rootPath: string, relativePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(this.resolve(rootPath, relativePath));
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  async scanFolder(rootPath: string, relativePath: string): Promise<ScannedFileNode[]> {
    const results: ScannedFileNode[] = [];
    await this.scanRecursive(rootPath, relativePath, '', results);
    return results;
  }

  async scanWorkspaceForCandidates(
    rootPath: string,
    ignorePatterns: string[]
  ): Promise<ScannedCandidate[]> {
    const candidates: ScannedCandidate[] = [];

    const isIgnored = (relativePath: string, isDir: boolean): boolean => {
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
      const absolutePath = this.resolve(rootPath, relativePath);
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

  //Private Helpers 

  private async scanRecursive(
    rootPath: string,
    folderRelativePath: string,
    prefix: string,
    results: ScannedFileNode[]
  ): Promise<void> {
    const absolutePath = this.resolve(
      rootPath,
      prefix ? PathUtils.join(folderRelativePath, prefix) : folderRelativePath
    );

    try {
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });

      for (const entry of entries) {
        const entryRelativePath = prefix ? PathUtils.join(prefix, entry.name) : entry.name;

        const entryAbsolutePath = path.join(absolutePath, entry.name);
        const stat = await fs.stat(entryAbsolutePath);

        results.push({
          name: entry.name,
          path: entryRelativePath,
          isDirectory: entry.isDirectory(),
          lastModified: stat.mtime.toISOString(),
        });

        if (entry.isDirectory()) {
          await this.scanRecursive(rootPath, folderRelativePath, entryRelativePath, results);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn('scanner failed to read directory', { absolutePath });
      }
    }
  }

  private resolve(rootPath: string, relativePath: string): string {
    const joined = path.join(rootPath, PathUtils.normalize(relativePath));
    return joined.replace(/\\/g, '/');
  }
}