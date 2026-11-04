import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import type { CodeFileSummaryDto } from '@shared/ipc/linking';
import { doclinkFilePath } from './doclink-path';

const FILE_INDEX_FILE = 'file-index.json';

interface FileIndexEntry {
  id: string;
  isDirectory: boolean;
}

interface FileIndexSchema {
  files?: Record<string, FileIndexEntry>;
}

export class FilesystemCodeFileQuery {
  constructor(private readonly file: AtomicJsonFile) {}

  async getAllCodeFiles(rootPath: string): Promise<CodeFileSummaryDto[]> {
    try {
      const index = await this.file.readJson<FileIndexSchema>(
        doclinkFilePath(rootPath, FILE_INDEX_FILE)
      );
      const files = index.files ?? {};
      return Object.entries(files)
        .filter(([, entry]) => !entry.isDirectory)
        .map(([path, entry]) => ({
          id: entry.id,
          name: path.split('/').pop() || path,
          path,
        }));
    } catch {
      return [];
    }
  }

  async getCodeFileById(rootPath: string, id: string): Promise<CodeFileSummaryDto | null> {
    try {
      const index = await this.file.readJson<FileIndexSchema>(
        doclinkFilePath(rootPath, FILE_INDEX_FILE)
      );
      const files = index.files ?? {};
      for (const [path, entry] of Object.entries(files)) {
        if (entry.id === id && !entry.isDirectory) {
          return {
            id: entry.id,
            name: path.split('/').pop() || path,
            path,
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }
}