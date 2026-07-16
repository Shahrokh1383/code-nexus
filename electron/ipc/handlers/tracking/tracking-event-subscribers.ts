import { EventBus } from '../../../../src/domains/shared-kernel/events/event-bus';
import { IDomainEventHandler } from '../../../../src/domains/shared-kernel/events/domain-event-handler.interface';
import { ReviewRequiredEvent } from '../../../../src/domains/tracking/domain/events/review-required';
import { CommitApprovedEvent } from '../../../../src/domains/tracking/domain/events/commit-approved';
import { IpcChannels } from '../../channels';
import { getCurrentWorkspaceRoot } from './workspace-context';

// We need a reference to the main window to push updates.
// This will be provided when registering the event subscribers.
let mainWindow: Electron.BrowserWindow | null = null;

export function setTrackingEventRelayWindow(win: Electron.BrowserWindow | null): void {
  mainWindow = win;
}

class ReviewRequiredPushHandler implements IDomainEventHandler<ReviewRequiredEvent> {
  async handle(event: ReviewRequiredEvent): Promise<void> {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    // Notify renderer that the document’s pending state changed.
    mainWindow.webContents.send(IpcChannels.TRACKING_PENDING_UPDATED, {
      documentIds: [event.documentId.value]
    });
  }
}

class CommitApprovedPushHandler implements IDomainEventHandler<CommitApprovedEvent> {
  async handle(event: CommitApprovedEvent): Promise<void> {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    // After commit, the document is no longer pending – push update.
    mainWindow.webContents.send(IpcChannels.TRACKING_PENDING_UPDATED, {
      documentIds: [event.documentId.value]
    });
  }
}

export function registerTrackingEventSubscribers(): void {
  const eventBus = EventBus.getInstance();
  eventBus.register('ReviewRequiredEvent', new ReviewRequiredPushHandler());
  eventBus.register('CommitApprovedEvent', new CommitApprovedPushHandler());
}