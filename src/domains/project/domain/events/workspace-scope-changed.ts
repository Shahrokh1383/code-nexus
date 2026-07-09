import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { WorkspaceId } from '../value-objects/workspace-id';
import { WorkspacePath } from '../value-objects/workspace-path';

export class WorkspaceScopeChangedEvent extends DomainEvent {
  readonly workspaceId: WorkspaceId;
  readonly oldRootPath: WorkspacePath;
  readonly newRootPath: WorkspacePath;

  constructor(workspaceId: WorkspaceId, oldRootPath: WorkspacePath, newRootPath: WorkspacePath) {
    super('WorkspaceScopeChanged');
    this.workspaceId = workspaceId;
    this.oldRootPath = oldRootPath;
    this.newRootPath = newRootPath;
  }
}