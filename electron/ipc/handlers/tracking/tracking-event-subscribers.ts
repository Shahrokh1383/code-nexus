import { BrowserWindow } from 'electron';
import { EventBus } from '../../../../src/domains/shared-kernel/events/event-bus';
import { IDomainEventHandler } from '../../../../src/domains/shared-kernel/events/domain-event-handler.interface';
import { ReviewRequiredEvent } from '../../../../src/domains/tracking/domain/events/review-required';
import { CommitApprovedEvent } from '../../../../src/domains/tracking/domain/events/commit-approved';
import { HashRevertedEvent } from '../../../../src/domains/tracking/domain/events/hash-reverted';
import { IpcChannels } from '../../channels';
import { getCurrentWorkspaceRoot } from './workspace-context';

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

class HashRevertedPushHandler implements IDomainEventHandler<HashRevertedEvent> {
  async handle(event: HashRevertedEvent): Promise<void> {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send(IpcChannels.TRACKING_PENDING_UPDATED, {});
  }
}

export function registerTrackingEventSubscribers(): void {
  const eventBus = EventBus.getInstance();
  eventBus.register('ReviewRequiredEvent', new ReviewRequiredPushHandler());
  eventBus.register('CommitApprovedEvent', new CommitApprovedPushHandler());
  eventBus.register('HashRevertedEvent', new HashRevertedPushHandler());
}