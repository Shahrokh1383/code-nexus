export interface ICacheFileSystem {
  readTextFile(absolutePath: string): Promise<string>;
  writeTextFile(absolutePath: string, content: string): Promise<void>;
  ensureDir(absolutePath: string): Promise<void>;
  deleteFile(absolutePath: string): Promise<void>;
}