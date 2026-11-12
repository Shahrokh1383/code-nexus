/**
 * Tracking feature IPC contract.
 * Channel strings are byte-for-byte from the legacy IpcChannels enum so the
 * preload whitelist and renderer remain compatible.
 */

export const TRACKING_CHANNELS = {
  RECORD_HASH: 'tracking:recordHash',
  DETECT_CHANGES: 'tracking:detectChanges',
  APPROVE_COMMIT: 'tracking:approveCommit',
  GET_PENDING_CHANGES: 'tracking:getPendingChanges',
  GET_COMMIT_HISTORY: 'tracking:getCommitHistory',
  GET_FILE_DIFF: 'tracking:getFileDiff',
  GET_ALL_PENDING_STATUS: 'tracking:getAllPendingStatus',
  PENDING_UPDATED: 'tracking:pendingUpdated',
} as const;

export type TrackingChannel =
  (typeof TRACKING_CHANNELS)[keyof typeof TRACKING_CHANNELS];

export interface FileHashDto {
  filePath: string;
  hashValue: string;
  committedAt: string | null;
  status: 'PENDING';
}

export interface PendingStatusDto {
  documentId: string;
  pendingCount: number;
}

export interface DiffLineDto {
  lineNumber: number;
  content: string;
  type: string;
}

export interface ContentDiffDto {
  filePath: string;
  oldHash: string;
  newHash: string;
  addedLines: DiffLineDto[];
  removedLines: DiffLineDto[];
  modifiedLines: DiffLineDto[];
}

export type FileDiffResult = ContentDiffDto | null | 'CACHE_MISSING';

export interface GranularCommitDto {
  id: string;
  documentId: string;
  filePaths: string[];
  committedAt: string;
  status: string;
}

// ─── Request inputs (one per channel, workspaceId = root path) ───

export interface RecordHashInput {
  workspaceId: string;
  filePath: string;
  content: string;
}

export interface DetectChangesInput {
  workspaceId: string;
  filePath: string;
}

export interface ApproveCommitInput {
  workspaceId: string;
  documentId: string;
}

export interface GetPendingChangesInput {
  workspaceId: string;
  documentId?: string;
}

export interface GetCommitHistoryInput {
  workspaceId: string;
  documentId: string;
}

export interface GetFileDiffInput {
  workspaceId: string;
  filePath: string;
}

export interface GetAllPendingStatusInput {
  workspaceId: string;
}