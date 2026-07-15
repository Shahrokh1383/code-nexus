import { promises as fs } from 'fs';
import * as path from 'path';
import { IFileContentReader } from '../../application/ports/file-content-reader.interface';

export class FileContentReaderAdapter implements IFileContentReader {
  private static cache = new Map<string, string>();
  private static userDataPath: string | null = null;

  constructor(private readonly _workspaceRoot: string) {}

  static setUserDataPath(userDataPath: string): void {
    FileContentReaderAdapter.userDataPath = userDataPath;
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
    const cached = FileContentReaderAdapter.cache.get(filePath);
    return cached !== undefined ? cached : undefined;
  }

  updateCache(filePath: string, content: string): void {
    FileContentReaderAdapter.cache.set(filePath, content);
  }

  static clearCache(): void {
    FileContentReaderAdapter.cache.clear();
  }

  private static getBaselinesPath(): string {
    if (!FileContentReaderAdapter.userDataPath) {
      throw new Error('User data path not set. Call FileContentReaderAdapter.setUserDataPath() first.');
    }
    return path.join(FileContentReaderAdapter.userDataPath, 'codeness-baselines.json');
  }

  static async saveBaseline(workspaceRoot: string, filePath: string, content: string): Promise<void> {
    const baselinesFile = FileContentReaderAdapter.getBaselinesPath();
    let baselines: Record<string, Record<string, string>> = {};
    try {
      const raw = await fs.readFile(baselinesFile, 'utf-8');
      baselines = JSON.parse(raw);
    } catch {}
    if (!baselines[workspaceRoot]) baselines[workspaceRoot] = {};
    baselines[workspaceRoot][filePath] = content;
    await fs.writeFile(baselinesFile, JSON.stringify(baselines, null, 2), 'utf-8');
  }

  static async loadBaseline(workspaceRoot: string, filePath: string): Promise<string | null> {
    const baselinesFile = FileContentReaderAdapter.getBaselinesPath();
    try {
      const raw = await fs.readFile(baselinesFile, 'utf-8');
      const baselines = JSON.parse(raw);
      return baselines[workspaceRoot]?.[filePath] ?? null;
    } catch {
      return null;
    }
  }
}