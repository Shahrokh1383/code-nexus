import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { WorkspaceId } from '../value-objects/workspace-id';

export class WorkspaceClosedEvent extends DomainEvent {
  readonly workspaceId: WorkspaceId;

  constructor(workspaceId: WorkspaceId) {
    super('WorkspaceClosed');
    this.workspaceId = workspaceId;
  }
}