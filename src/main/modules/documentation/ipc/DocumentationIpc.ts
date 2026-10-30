import { DOCUMENTATION_CHANNELS } from '@shared/ipc/documentation';
import type { ServiceContainer } from '../../../kernel/service-container';
import type { Logger } from '../../../shared/logger/logger';
import { createIpcHandler } from '../../../shared/ipc/handler';
import { DocumentServiceToken, DocsFolderServiceToken } from '../services/tokens';
import {
  registerDocsFolderSchema,
  detectRelocationSchema,
  getAllDocumentsSchema,
  getDeletedDocumentsSchema,
  getOrphanedDocumentsSchema,
  syncFilesSchema,
  softDeleteDocumentSchema,
  permanentDeleteDocumentSchema,
  restoreDocumentSchema,
} from './schemas';

export function registerDocumentationIpc(container: ServiceContainer, logger: Logger): void {
  const documents = () => container.resolve(DocumentServiceToken);
  const folders = () => container.resolve(DocsFolderServiceToken);

  createIpcHandler(logger, {
    channel: DOCUMENTATION_CHANNELS.REGISTER_FOLDER,
    schema: registerDocsFolderSchema,
    execute: ({ workspaceId, suggestedPath }) => folders().register(workspaceId, suggestedPath),
  });

  createIpcHandler(logger, {
    channel: DOCUMENTATION_CHANNELS.DETECT_RELOCATION,
    schema: detectRelocationSchema,
    execute: ({ workspaceId }) => folders().detectRelocation(workspaceId),
  });

  createIpcHandler(logger, {
    channel: DOCUMENTATION_CHANNELS.GET_ALL,
    schema: getAllDocumentsSchema,
    execute: ({ workspaceId }) => documents().getAll(workspaceId),
  });

  createIpcHandler(logger, {
    channel: DOCUMENTATION_CHANNELS.GET_DELETED,
    schema: getDeletedDocumentsSchema,
    execute: ({ workspaceId }) => documents().getDeleted(workspaceId),
  });

  createIpcHandler(logger, {
    channel: DOCUMENTATION_CHANNELS.GET_ORPHANED,
    schema: getOrphanedDocumentsSchema,
    execute: ({ workspaceId }) => documents().getOrphans(workspaceId),
  });

  createIpcHandler(logger, {
    channel: DOCUMENTATION_CHANNELS.SOFT_DELETE_DOCUMENT,
    schema: softDeleteDocumentSchema,
    execute: ({ workspaceId, documentId }) => documents().softDelete(workspaceId, documentId),
  });

  createIpcHandler(logger, {
    channel: DOCUMENTATION_CHANNELS.PERMANENT_DELETE_DOCUMENT,
    schema: permanentDeleteDocumentSchema,
    execute: ({ workspaceId, documentId }) => documents().permanentDelete(workspaceId, documentId),
  });

  createIpcHandler(logger, {
    channel: DOCUMENTATION_CHANNELS.RESTORE_DOCUMENT,
    schema: restoreDocumentSchema,
    execute: ({ workspaceId, documentId }) => documents().restore(workspaceId, documentId),
  });

  createIpcHandler(logger, {
    channel: DOCUMENTATION_CHANNELS.SYNC_FILES,
    schema: syncFilesSchema,
    execute: ({ workspaceId }) => folders().syncFiles(workspaceId),
  });
}