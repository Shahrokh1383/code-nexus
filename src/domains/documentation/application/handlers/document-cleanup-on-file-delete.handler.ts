import { IDomainEventHandler } from '../../../shared-kernel/events/domain-event-handler.interface';
import { FileDeletedEvent } from '../../../filesystem/domain/events/file-deleted';
import { IDocumentRepository } from '../../domain/repository/document-repository.interface';
import { IProjectConfigRepository } from '../../../project/domain/repository/project-config-repository.interface';
import { WorkspaceId } from '../../../project/domain/value-objects/workspace-id';
import { DocumentPath } from '../../domain/value-objects/document-path';
import { PathUtils } from '../../../shared-kernel/utils/path-utils';

/**
 * Listens to FileDeletedEvent from FileSystem context.
 * If the deleted file resides inside the registered docs folder and is a tracked document,
 * removes it from the document repository, keeping the metadata consistent.
 */
export class DocumentCleanupOnFileDelete implements IDomainEventHandler<FileDeletedEvent> {
  private readonly eventType = 'FileDeletedEvent';

  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly configRepo: IProjectConfigRepository,
    private readonly workspaceId: WorkspaceId
  ) {}

  getEventType(): string {
    return this.eventType;
  }

  async handle(event: FileDeletedEvent): Promise<void> {
    try {
      const config = await this.configRepo.findByWorkspaceId(this.workspaceId);
      const docsFolderPath = config?.docsFolderPath.getOrNull();
      if (!docsFolderPath) return;

      // event.path is the relative file path (FilePath value object)
      const deletedPath = event.path.value;
      if (!PathUtils.isWithin(docsFolderPath, deletedPath)) return;

      const document = await this.documentRepo.findByPath(new DocumentPath(deletedPath));
      if (!document) return;

      await this.documentRepo.delete(document.id);
    } catch {
      // Silently ignore failures
    }
  }
}