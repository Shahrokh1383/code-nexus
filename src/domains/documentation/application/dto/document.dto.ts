export interface DocumentDto {
  id: string;
  path: string;
  title: string;
  lastModified: string;
  linkCount: number;
  isOrphaned: boolean;
}