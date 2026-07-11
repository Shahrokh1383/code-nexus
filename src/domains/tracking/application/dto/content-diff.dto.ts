export interface ContentDiffDto {
  readonly filePath: string;
  readonly oldHash: string;
  readonly newHash: string;
  readonly addedLines: Array<{ lineNumber: number; content: string; type: string }>;
  readonly removedLines: Array<{ lineNumber: number; content: string; type: string }>;
  readonly modifiedLines: Array<{ lineNumber: number; content: string; type: string }>;
}