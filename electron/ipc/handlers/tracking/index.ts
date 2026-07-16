import { registerPendingChangesIpcHandlers } from './pending-changes.ipc';
import { registerApproveCommitIpcHandler } from './approve-commit.ipc';
import { registerCommitHistoryIpcHandler } from './commit-history.ipc';
import { registerFileDiffIpcHandler } from './file-diff.ipc';
import { registerDetectChangesIpcHandlers } from './detect-changes.ipc';
import { registerTrackingEventSubscribers, setTrackingEventRelayWindow } from './tracking-event-subscribers';

export function registerTrackingHandlers(mainWindow?: Electron.BrowserWindow): void {
  // Provide the main window for real‑time push notifications
  if (mainWindow) setTrackingEventRelayWindow(mainWindow);

  registerDetectChangesIpcHandlers();
  registerPendingChangesIpcHandlers();
  registerApproveCommitIpcHandler();
  registerCommitHistoryIpcHandler();
  registerFileDiffIpcHandler();
  registerTrackingEventSubscribers();
}