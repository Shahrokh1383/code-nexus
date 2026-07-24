export interface FileNodeDto {
  readonly id: string;
  readonly path: string;
  readonly name: string;
  readonly lastModified: string;
  readonly isDirectory: boolean;
}