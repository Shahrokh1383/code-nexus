import { WorkspaceClosedEvent } from '../../../domain/events/workspace-closed';
import { WorkspaceId } from '../../../domain/value-objects/workspace-id';

describe('WorkspaceClosedEvent', () => {
  it('should create event with correct name and payload', () => {
    const workspaceId = new WorkspaceId('test-id-123');
    const event = new WorkspaceClosedEvent(workspaceId);

    expect(event.eventName).toBe('WorkspaceClosed');
    expect(event.workspaceId).toBe(workspaceId);
    expect(event.workspaceId.value).toBe('test-id-123');
  });
});