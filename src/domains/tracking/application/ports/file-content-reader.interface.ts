export interface IFileContentReader {
  readContent(filePath: string): Promise<string>;
  getPreviousContent(filePath: string): Promise<string | null>;
  updateCache(filePath: string, content: string): void;
}