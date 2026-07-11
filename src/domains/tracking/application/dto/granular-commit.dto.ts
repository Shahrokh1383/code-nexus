export interface GranularCommitDto {
  readonly id: string;
  readonly documentId: string;
  readonly filePaths: string[];
  readonly committedAt: string;
  readonly status: string;
}