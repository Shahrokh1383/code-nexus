import { promises as fs } from 'fs';
import * as path from 'path';
import { IFileContentReader } from '../../application/ports/file-content-reader.interface';

export class FileContentReaderAdapter implements IFileContentReader {
  private readonly cache = new Map<string, string>();
  private readonly baselinesPath: string;

  constructor(
    private readonly _workspaceRoot: string,
    userDataPath: string
  ) {
    this.baselinesPath = path.join(userDataPath, 'codeness-baselines.json');
  }

  get workspaceRoot(): string {
    return this._workspaceRoot;
  }

  getWorkspaceRoot(): string {
    return this._workspaceRoot;
  }

  async readContent(filePath: string): Promise<string> {
    const absolutePath = path.join(this._workspaceRoot, filePath);
    const raw = await fs.readFile(absolutePath, 'utf-8');
    return raw.replace(/\r\n|\r/g, '\n');
  }

  async getPreviousContent(filePath: string): Promise<string | undefined> {
    return this.cache.get(filePath);
  }

  updateCache(filePath: string, content: string): void {
    this.cache.set(filePath, content);
  }

  clearCache(): void {
    this.cache.clear();
  }

  async saveBaseline(filePath: string, content: string): Promise<void> {
    let baselines: Record<string, Record<string, string>> = {};
    try {
      const raw = await fs.readFile(this.baselinesPath, 'utf-8');
      baselines = JSON.parse(raw);
    } catch {}
    
    if (!baselines[this._workspaceRoot]) {
      baselines[this._workspaceRoot] = {};
    }
    
    baselines[this._workspaceRoot][filePath] = content;
    await fs.writeFile(this.baselinesPath, JSON.stringify(baselines, null, 2), 'utf-8');
  }

  async loadBaseline(filePath: string): Promise<string | null> {
    try {
      const raw = await fs.readFile(this.baselinesPath, 'utf-8');
      const baselines = JSON.parse(raw);
      return baselines[this._workspaceRoot]?.[filePath] ?? null;
    } catch {
      return null;
    }
  }
}