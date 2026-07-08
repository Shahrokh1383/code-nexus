import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { WorkspaceId } from '../value-objects/workspace-id';
import { WorkspacePath } from '../value-objects/workspace-path';

export class WorkspaceInitializedEvent extends DomainEvent {
  readonly workspaceId: WorkspaceId;
  readonly rootPath: WorkspacePath;

  constructor(workspaceId: WorkspaceId, rootPath: WorkspacePath) {
    super('WorkspaceInitialized');
    this.workspaceId = workspaceId;
    this.rootPath = rootPath;
  }
}