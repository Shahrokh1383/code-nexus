import { DomainEvent } from '../../../shared-kernel/events/domain-event';

export class ScanCompletedEvent extends DomainEvent {
  readonly workspaceId: string;
  readonly fileCount: number;
  readonly folderCount: number;
  readonly durationMs: number;

  constructor(workspaceId: string, fileCount: number, folderCount: number, durationMs: number) {
    super('ScanCompleted');
    this.workspaceId = workspaceId;
    this.fileCount = fileCount;
    this.folderCount = folderCount;
    this.durationMs = durationMs;
  }
}