export interface ProjectConfigDto {
  workspaceId: string;
  docsFolderPath: string | null;
  ignorePatterns: string[];
  schemaVersion: string;
}