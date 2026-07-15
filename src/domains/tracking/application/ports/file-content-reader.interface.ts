export interface IFileContentReader {
  readContent(filePath: string): Promise<string>;
  getPreviousContent(filePath: string): Promise<string | undefined>;
  updateCache(filePath: string, content: string): void;
  getWorkspaceRoot(): string;
}