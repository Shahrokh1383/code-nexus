import { PathUtils } from '@/domains/shared-kernel/utils/path-utils';
import { promises as fs } from 'fs';

export class JsonDatabase {
  private readonly doclinkPath: string;

  constructor(workspaceRoot: string) {
    this.doclinkPath = PathUtils.join(workspaceRoot, '.doclink');
  }

  async ensureDoclinkExists(): Promise<void> {
    await fs.mkdir(this.doclinkPath, { recursive: true });
  }

  async read<T>(filename: string): Promise<T> {
    const filePath = PathUtils.join(this.doclinkPath, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  }

  async write<T>(filename: string, data: T): Promise<void> {
    const filePath = PathUtils.join(this.doclinkPath, filename);
    const tempPath = `${filePath}.tmp`;

    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, filePath);
  }

  async writeTextFile(filename: string, content: string): Promise<void> {
    const filePath = PathUtils.join(this.doclinkPath, filename);
    const tempPath = `${filePath}.tmp`;

    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, filePath);
  }

  async readTextFile(filename: string): Promise<string> {
    const filePath = PathUtils.join(this.doclinkPath, filename);
    return fs.readFile(filePath, 'utf-8');
  }
}