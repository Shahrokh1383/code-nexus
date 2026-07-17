import { registerRegisterDocsFolderIpcHandler } from './register-docs-folder.ipc';
import { registerDetectRelocationIpcHandler } from './detect-relocation.ipc';
import { registerGetAllDocumentsIpcHandler } from './get-all-documents.ipc';
import { registerGetOrphanedDocumentsIpcHandler } from './get-orphaned-documents.ipc';
import { registerSoftDeleteDocumentIpcHandler } from './soft-delete-document.ipc';
import { registerPermanentDeleteDocumentIpcHandler } from './permanent-delete-document.ipc';
import { registerRestoreDocumentIpcHandler } from './restore-document.ipc';
import { registerGetDeletedDocumentsIpcHandler } from './get-deleted-documents.ipc';
import { registerSyncFilesIpcHandler } from './sync-files.ipc';

export function registerDocumentationHandlers(): void {
  registerRegisterDocsFolderIpcHandler();
  registerDetectRelocationIpcHandler();
  registerGetAllDocumentsIpcHandler();
  registerGetOrphanedDocumentsIpcHandler();
  registerSoftDeleteDocumentIpcHandler();
  registerPermanentDeleteDocumentIpcHandler();
  registerRestoreDocumentIpcHandler();
  registerGetDeletedDocumentsIpcHandler();
  registerSyncFilesIpcHandler();
}