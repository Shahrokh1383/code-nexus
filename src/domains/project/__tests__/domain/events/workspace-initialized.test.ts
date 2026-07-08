import { WorkspaceInitializedEvent } from '../../../domain/events/workspace-initialized';
import { WorkspaceId } from '../../../domain/value-objects/workspace-id';
import { WorkspacePath } from '../../../domain/value-objects/workspace-path';

describe('WorkspaceInitializedEvent', () => {
  it('should create with correct payload', () => {
    const id = new WorkspaceId('ws-1');
    const path = new WorkspacePath('/home/project');
    const event = new WorkspaceInitializedEvent(id, path);

    expect(event.eventType).toBe('WorkspaceInitialized');
    expect(event.workspaceId.value).toBe('ws-1');
    expect(event.rootPath.value).toBe('/home/project');
    expect(event.occurredOn).toBeDefined();
    expect(event.eventId).toBeDefined();
  });
});