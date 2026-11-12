import { TRACKING_CHANNELS } from '@shared/ipc/tracking';

export const trackingKeys = {
  all: ['tracking'] as const,
  pending: (workspaceId: string | null, documentId: string | null) =>
    [...trackingKeys.all, 'pending', workspaceId, documentId] as const,
  history: (workspaceId: string | null, documentId: string | null) =>
    [...trackingKeys.all, 'history', workspaceId, documentId] as const,
  allPendingStatus: (workspaceId: string | null) =>
    [...trackingKeys.all, 'allPending', workspaceId] as const,
  pushChannel: TRACKING_CHANNELS.PENDING_UPDATED,
};