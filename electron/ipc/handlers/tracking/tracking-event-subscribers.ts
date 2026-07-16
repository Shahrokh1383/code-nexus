import { BrowserWindow } from 'electron';
import { EventBus } from '../../../../src/domains/shared-kernel/events/event-bus';
import { IDomainEventHandler } from '../../../../src/domains/shared-kernel/events/domain-event-handler.interface';
import { ReviewRequiredEvent } from '../../../../src/domains/tracking/domain/events/review-required';
import { CommitApprovedEvent } from '../../../../src/domains/tracking/domain/events/commit-approved';
import { ChangesDetectedEvent } from '../../../../src/domains/tracking/domain/events/changes-detected';
import { IpcChannels } from '../../channels';

let mainWindow: BrowserWindow | null = null;

export function setTrackingEventRelayWindow(win: BrowserWindow | null): void {
  mainWindow = win;
}

class ReviewRequiredPushHandler implements IDomainEventHandler<ReviewRequiredEvent> {
  async handle(event: ReviewRequiredEvent): Promise<void> {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send(IpcChannels.TRACKING_PENDING_UPDATED, {
      documentIds: [event.documentId.value]
    });
  }
}

class CommitApprovedPushHandler implements IDomainEventHandler<CommitApprovedEvent> {
  async handle(event: CommitApprovedEvent): Promise<void> {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send(IpcChannels.TRACKING_PENDING_UPDATED, {
      documentIds: [event.documentId.value]
    });
  }
}

class ChangesDetectedPushHandler implements IDomainEventHandler<ChangesDetectedEvent> {
  async handle(_event: ChangesDetectedEvent): Promise<void> {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    // Tell renderer to refresh pending counts for all documents
    mainWindow.webContents.send(IpcChannels.TRACKING_PENDING_UPDATED, {});
  }
}

export function registerTrackingEventSubscribers(): void {
  const eventBus = EventBus.getInstance();
  eventBus.register('ReviewRequiredEvent', new ReviewRequiredPushHandler());
  eventBus.register('CommitApprovedEvent', new CommitApprovedPushHandler());
  eventBus.register('ChangesDetectedEvent', new ChangesDetectedPushHandler());
}