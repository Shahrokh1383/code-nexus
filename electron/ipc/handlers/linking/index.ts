import { registerCodeLinkIpcHandlers } from './code-link-ipc';
import { registerDocumentLinkIpcHandlers } from './document-link-ipc';
import { registerMigrationIpcHandler } from './migration-ipc';
import { registerLinkingEventSubscribers } from './event-subscribers';

export function registerLinkingHandlers(): void {
  registerCodeLinkIpcHandlers();
  registerDocumentLinkIpcHandlers();
  registerMigrationIpcHandler();
  registerLinkingEventSubscribers();
}