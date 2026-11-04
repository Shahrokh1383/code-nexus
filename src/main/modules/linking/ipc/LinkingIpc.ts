import { LINKING_CHANNELS } from '@shared/ipc/linking';
import type { ServiceContainer } from '../../../kernel/service-container';
import type { Logger } from '../../../shared/logger/logger';
import { createIpcHandler } from '../../../shared/ipc/handler';
import { CodeLinkServiceToken, DocumentLinkServiceToken } from '../services/tokens';
import {
  createLinkSchema,
  removeLinkSchema,
  createDocumentLinkSchema,
  removeDocumentLinkSchema,
  migrateLinksSchema,
  getLinksForDocumentSchema,
  getLinksForCodeFileSchema,
  getUnlinkedCodeFilesSchema,
  getDocumentChildrenSchema,
  getDocumentParentsSchema,
  createBulkCodeLinksSchema,
} from './schemas';

export function registerLinkingIpc(container: ServiceContainer, logger: Logger): void {
  const codeLinks = () => container.resolve(CodeLinkServiceToken);
  const docLinks = () => container.resolve(DocumentLinkServiceToken);

  createIpcHandler(logger, {
    channel: LINKING_CHANNELS.CREATE_LINK,
    schema: createLinkSchema,
    execute: ({ workspaceId, codeFileId, documentId }) =>
      codeLinks().createLink(workspaceId, codeFileId, documentId),
  });

  createIpcHandler(logger, {
    channel: LINKING_CHANNELS.REMOVE_LINK,
    schema: removeLinkSchema,
    execute: ({ workspaceId, linkId }) => codeLinks().removeLink(workspaceId, linkId),
  });

  createIpcHandler(logger, {
    channel: LINKING_CHANNELS.CREATE_DOCUMENT_LINK,
    schema: createDocumentLinkSchema,
    execute: ({ workspaceId, parentDocumentId, childDocumentId }) =>
      docLinks().create(workspaceId, parentDocumentId, childDocumentId),
  });

  createIpcHandler(logger, {
    channel: LINKING_CHANNELS.REMOVE_DOCUMENT_LINK,
    schema: removeDocumentLinkSchema,
    execute: ({ workspaceId, linkId }) => docLinks().remove(workspaceId, linkId),
  });

  createIpcHandler(logger, {
    channel: LINKING_CHANNELS.MIGRATE_LINKS,
    schema: migrateLinksSchema,
    execute: ({ workspaceId, oldDocumentId, newDocumentIds }) =>
      codeLinks().migrate(workspaceId, oldDocumentId, newDocumentIds),
  });

  createIpcHandler(logger, {
    channel: LINKING_CHANNELS.GET_LINKS_FOR_DOCUMENT,
    schema: getLinksForDocumentSchema,
    execute: ({ workspaceId, documentId }) =>
      codeLinks().getLinksForDocument(workspaceId, documentId),
  });

  createIpcHandler(logger, {
    channel: LINKING_CHANNELS.GET_LINKS_FOR_CODEFILE,
    schema: getLinksForCodeFileSchema,
    execute: ({ workspaceId, codeFileId }) =>
      codeLinks().getLinksForCodeFile(workspaceId, codeFileId),
  });

  createIpcHandler(logger, {
    channel: LINKING_CHANNELS.GET_UNLINKED_CODEFILES,
    schema: getUnlinkedCodeFilesSchema,
    execute: ({ workspaceId }) => codeLinks().getUnlinkedCodeFiles(workspaceId),
  });

  createIpcHandler(logger, {
    channel: LINKING_CHANNELS.GET_DOCUMENT_CHILDREN,
    schema: getDocumentChildrenSchema,
    execute: ({ workspaceId, parentDocumentId }) =>
      docLinks().getChildren(workspaceId, parentDocumentId),
  });

  createIpcHandler(logger, {
    channel: LINKING_CHANNELS.GET_DOCUMENT_PARENTS,
    schema: getDocumentParentsSchema,
    execute: ({ workspaceId, childDocumentId }) =>
      docLinks().getParents(workspaceId, childDocumentId),
  });

  createIpcHandler(logger, {
    channel: LINKING_CHANNELS.CREATE_BULK_CODE_LINKS,
    schema: createBulkCodeLinksSchema,
    execute: ({ workspaceId, codeFileIds, documentId }) =>
      codeLinks().createBulk(workspaceId, codeFileIds, documentId),
  });
}