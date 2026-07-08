import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { WorkspaceId } from '../value-objects/workspace-id';

export class WorkspaceScopeChangedEvent extends DomainEvent {
  readonly workspaceId: WorkspaceId;
  readonly oldRootPath: string;
  readonly newRootPath: string;

  constructor(workspaceId: WorkspaceId, oldRootPath: string, newRootPath: string) {
    super('WorkspaceScopeChanged');
    this.workspaceId = workspaceId;
    this.oldRootPath = oldRootPath;
    this.newRootPath = newRootPath;
  }
}