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

  async read<T>(filename: string): Promise<T> {
    const filePath = PathUtils.join(this.doclinkPath, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  }

  async write<T>(filename: string, data: T): Promise<void> {
    await this.ensureDoclinkExists();
    const filePath = PathUtils.join(this.doclinkPath, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
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