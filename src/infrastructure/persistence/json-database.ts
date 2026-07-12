import { PathUtils } from '../../domains/shared-kernel/utils/path-utils';
import { promises as fs } from 'fs';

export class JsonDatabase {
  private readonly doclinkPath: string;

  constructor(workspaceRoot: string) {
    this.doclinkPath = PathUtils.join(workspaceRoot, '.doclink');
  }

  async ensureDoclinkExists(): Promise<void> {
    await fs.mkdir(this.doclinkPath, { recursive: true });
  }

  async read<T>(filename: string, retries = 3): Promise<T> {
    const filePath = PathUtils.join(this.doclinkPath, filename);
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        if (content.trim().length === 0) {
          throw new Error('File is empty');
        }
        return JSON.parse(content) as T;
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
      }
    }
    throw new Error('Unreachable');
  }

  async write<T>(filename: string, data: T): Promise<void> {
    await this.ensureDoclinkExists();
    const filePath = PathUtils.join(this.doclinkPath, filename);
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, json, 'utf-8');
  }

  async writeTextFile(filename: string, content: string): Promise<void> {
    await this.ensureDoclinkExists();
    const filePath = PathUtils.join(this.doclinkPath, filename);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async readTextFile(filename: string): Promise<string> {
    const filePath = PathUtils.join(this.doclinkPath, filename);
    return fs.readFile(filePath, 'utf-8');
  }
}