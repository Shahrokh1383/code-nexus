export interface IFileContentReader {
  readContent(filePath: string): Promise<string>;
  getPreviousContent(filePath: string): Promise<string | undefined>;
  updateCache(filePath: string, content: string): void;
  clearCache(): void;
  getWorkspaceRoot(): string;
  saveBaseline(filePath: string, content: string): Promise<void>;
  loadBaseline(filePath: string): Promise<string | null>;
}