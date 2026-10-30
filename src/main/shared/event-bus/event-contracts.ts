/**
 * Typed domain event registry (Constitution §14).
 * Event names are past tense. Payloads are plain data only — no value objects.
 * Future modules (tracking, linking, documentation) append their events here;
 * existing entries must not change shape.
 */
export interface DomainEventMap {
  'FileDiscovered': { path: string; isDirectory: boolean };
  'FileModified': { path: string };
  'FileDeleted': { path: string };
  'FileExcluded': { path: string };
  'FileMoved': { oldPath: string; newPath: string };
  'FileIndexRebuilt': { filePaths: string[] };
  'IgnorePatternsChanged': { workspaceId: string };
  'ScanCompleted': {
    workspaceId: string;
    fileCount: number;
    folderCount: number;
    durationMs: number;
  };
  'WorkspaceInitialized': { workspaceId: string; rootPath: string };
  'WorkspaceClosed': { workspaceId: string };
  'WorkspaceScopeChanged': {
    workspaceId: string;
    oldRootPath: string;
    newRootPath: string;
  };
}

export type DomainEventName = keyof DomainEventMap & string;
export type DomainEventPayload<K extends DomainEventName> = DomainEventMap[K];