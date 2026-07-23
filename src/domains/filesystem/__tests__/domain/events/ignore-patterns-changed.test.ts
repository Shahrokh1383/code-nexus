import { IgnorePatternsChangedEvent } from '../../../domain/events/ignore-patterns-changed';
import { WorkspaceId } from '../../../../project/domain/value-objects/workspace-id';

describe('IgnorePatternsChangedEvent', () => {
  it('should store the workspace id', () => {
    const workspaceId = new WorkspaceId('ws-1');
    const event = new IgnorePatternsChangedEvent(workspaceId);

    expect(event.eventType).toBe('IgnorePatternsChanged');
    expect(event.workspaceId).toBe(workspaceId);
    expect(event.workspaceId.value).toBe('ws-1');
  });
});