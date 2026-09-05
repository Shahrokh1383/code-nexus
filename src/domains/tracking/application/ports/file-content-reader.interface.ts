export interface IFileContentReader {
  readContent(relativePath: string): Promise<string>;
}