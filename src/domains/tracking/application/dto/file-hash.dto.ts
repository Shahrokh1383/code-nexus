export interface FileHashDto {
  readonly filePath: string;
  readonly hashValue: string;
  readonly committedAt: string | null;
  readonly status: string;
}