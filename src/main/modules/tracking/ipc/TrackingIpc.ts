import type { ServiceContainer } from '../../../kernel/service-container';
import type { Logger } from '../../../shared/logger/logger';
import { createIpcHandler } from '../../../shared/ipc/handler';
import { TRACKING_CHANNELS } from '@shared/ipc/tracking';
import { TrackingServiceToken, QueryServiceToken } from '../services/tokens';
import {
  recordHashSchema, detectChangesSchema, approveCommitSchema,
  getPendingChangesSchema, getCommitHistorySchema, getFileDiffSchema,
  getAllPendingStatusSchema,
} from './schemas';

export function registerTrackingIpc(container: ServiceContainer, logger: Logger): void {
  const tracking = () => container.resolve(TrackingServiceToken);
  const queries = () => container.resolve(QueryServiceToken);

  createIpcHandler(logger, {
    channel: TRACKING_CHANNELS.RECORD_HASH,
    schema: recordHashSchema,
    execute: ({ workspaceId, filePath, content }) =>
      tracking().recordHash(workspaceId, filePath, content).then(() => undefined),
  });

  createIpcHandler(logger, {
    channel: TRACKING_CHANNELS.DETECT_CHANGES,
    schema: detectChangesSchema,
    execute: ({ workspaceId, filePath }) =>
      tracking().detectChanges(workspaceId, filePath).then(() => undefined),
  });

  createIpcHandler(logger, {
    channel: TRACKING_CHANNELS.APPROVE_COMMIT,
    schema: approveCommitSchema,
    execute: ({ workspaceId, documentId }) =>
      tracking().approveCommit(workspaceId, documentId).then(() => undefined),
  });

  createIpcHandler(logger, {
    channel: TRACKING_CHANNELS.GET_PENDING_CHANGES,
    schema: getPendingChangesSchema,
    execute: ({ workspaceId, documentId }) =>
      queries().getPendingChanges(workspaceId, documentId),
  });

  createIpcHandler(logger, {
    channel: TRACKING_CHANNELS.GET_COMMIT_HISTORY,
    schema: getCommitHistorySchema,
    execute: ({ workspaceId, documentId }) =>
      queries().getCommitHistory(workspaceId, documentId),
  });

  createIpcHandler(logger, {
    channel: TRACKING_CHANNELS.GET_FILE_DIFF,
    schema: getFileDiffSchema,
    execute: ({ workspaceId, filePath }) => queries().getFileDiff(workspaceId, filePath),
  });

  createIpcHandler(logger, {
    channel: TRACKING_CHANNELS.GET_ALL_PENDING_STATUS,
    schema: getAllPendingStatusSchema,
    execute: ({ workspaceId }) => queries().getAllPendingStatus(workspaceId),
  });
}