import { WorkspaceScopeChangedEvent } from '../../../domain/events/workspace-scope-changed';
import { WorkspaceId } from '../../../domain/value-objects/workspace-id';

describe('WorkspaceScopeChangedEvent', () => {
  it('should create with correct payload', () => {
    const id = new WorkspaceId('ws-1');
    const event = new WorkspaceScopeChangedEvent(id, '/old/path', '/new/path');

    expect(event.eventType).toBe('WorkspaceScopeChanged');
    expect(event.workspaceId.value).toBe('ws-1');
    expect(event.oldRootPath).toBe('/old/path');
    expect(event.newRootPath).toBe('/new/path');
    expect(event.occurredOn).toBeDefined();
    expect(event.eventId).toBeDefined();
  });
});