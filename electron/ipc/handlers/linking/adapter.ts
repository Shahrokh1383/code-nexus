import { JsonDatabase } from '../../../../src/infrastructure/persistence/json-database';
import { ICodeFileQueryPort } from '../../../../src/domains/linking/application/ports/code-file-query.port';
import { CodeFileSummaryDto } from '../../../../src/domains/linking/application/dto/link.dto';

export class FilesystemCodeFileQueryAdapter implements ICodeFileQueryPort {
  constructor(private readonly db: JsonDatabase) {}

  async getAllCodeFiles(): Promise<CodeFileSummaryDto[]> {
    try {
      const index = await this.db.read<any>('file-index.json');
      return Object.entries(index.files || {})
        .filter(([_, entry]: [string, any]) => !entry.isDirectory)
        .map(([path, entry]: [string, any]) => ({
          id: entry.id,
          name: path.split('/').pop() || path,
          path: path
        }));
    } catch {
      return [];
    }
  }

  async getCodeFileById(id: string): Promise<CodeFileSummaryDto | null> {
    try {
      const index = await this.db.read<any>('file-index.json');
      const files = index.files || {};
      for (const [path, entry] of Object.entries(files) as [string, any][]) {
        if (entry.id === id && !entry.isDirectory) {
          return {
            id: entry.id,
            name: path.split('/').pop() || path,
            path: path
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }
}