import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { WorkspaceId } from '../../../project/domain/value-objects/workspace-id';

export class IgnorePatternsChangedEvent extends DomainEvent {
  readonly workspaceId: WorkspaceId;

  constructor(workspaceId: WorkspaceId) {
    super('IgnorePatternsChanged');
    this.workspaceId = workspaceId;
  }
}