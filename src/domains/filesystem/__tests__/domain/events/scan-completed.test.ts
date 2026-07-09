import { ScanCompletedEvent } from '../../../../domain/events/scan-completed';

describe('ScanCompletedEvent', () => {
  it('should create a scan completed event', () => {
    const event = new ScanCompletedEvent('workspace-1', 42, 7, 150);

    expect(event.eventType).toBe('ScanCompleted');
    expect(event.workspaceId).toBe('workspace-1');
    expect(event.fileCount).toBe(42);
    expect(event.folderCount).toBe(7);
    expect(event.durationMs).toBe(150);
    expect(event.occurredOn).toBeDefined();
    expect(event.eventId).toBeDefined();
  });
});