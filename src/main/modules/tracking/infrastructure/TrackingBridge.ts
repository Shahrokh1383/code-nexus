import type { EventBus } from '../../../shared/event-bus/event-bus';
import type { Logger } from '../../../shared/logger/logger';
import { TRACKING_CHANNELS } from '@shared/ipc/tracking';

export class TrackingBridge {
  constructor(
    private readonly events: EventBus,
    private readonly logger: Logger,
    private readonly isReady: () => boolean,
    private readonly send: (channel: string, payload: unknown) => void,
  ) {}

  subscribe(): void {
    this.events.on('ReviewRequired', ({ documentId }) =>
      this.push({ documentIds: [documentId] }),
    );
    this.events.on('CommitApproved', ({ documentId }) =>
      this.push({ documentIds: [documentId] }),
    );
    this.events.on('ChangesDetected', () => this.push({}));
  }

  private push(payload: unknown): void {
    if (!this.isReady()) return;
    try {
      this.send(TRACKING_CHANNELS.PENDING_UPDATED, payload);
    } catch (err) {
      this.logger.error('failed to push tracking update', {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}