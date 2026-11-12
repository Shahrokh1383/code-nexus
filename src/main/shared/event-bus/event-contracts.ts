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
  'DocumentDiscovered': { documentId: string; path: string; title: string } ;
  'DocumentDeleted': { documentId: string; path: string };
  'DocsFolderRelocated': {
    oldPath: string;
    newPath: string;
    signature: {
      fileCount: number;
      topLevelFileNames: string[];
      directoryDepth: number;
    };
  };
  'LinkCreated': {
    linkId: string;
    category: 'code' | 'doc';
    sourceId: string;
    targetId: string;
  };
  'LinkBroken': {
    linkId: string;
    category: 'code' | 'doc';
    sourceId: string;
    targetId: string;
  };
  'DocumentLinkCreated': {
    linkId: string;
    parentDocumentId: string;
    childDocumentId: string;
  };
  'DocumentLinkBroken': {
    linkId: string;
    parentDocumentId: string;
    childDocumentId: string;
  };
  'LinksMigrated': {
    parentDocumentId: string;
    childDocumentIds: string[];
    migratedLinkIds: string[];
  };
  'ChangesDetected': {
    filePath: string;
    oldHash: string;
    newHash: string;
    diffId: string;
  };
  'ReviewRequired': {
    documentId: string;
    filePath: string;
    changeType: 'OUTDATED' | 'ORPHAN' | 'UNLINKED';
  };
  'CommitApproved': {
    commitId: string;
    documentId: string;
    filePaths: string[];
  };
}

export type DomainEventName = keyof DomainEventMap & string;
export type DomainEventPayload<K extends DomainEventName> = DomainEventMap[K];