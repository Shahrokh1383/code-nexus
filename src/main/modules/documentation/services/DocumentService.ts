import { DomainException } from '../../../shared/errors/domain-exception';
import type { EventBus } from '../../../shared/event-bus/event-bus';
import type { DocFolderDto, DocumentDto, GetAllDocumentsResponse } from '@shared/ipc/documentation';
import type { DocFolder } from '../domain/DocFolder';
import type { Document } from '../domain/Document';
import type { DocsFolderConfigStore } from '../infrastructure/DocsFolderConfigStore';
import type { DocumentJsonRepository } from '../infrastructure/DocumentJsonRepository';
import type { DocumentFileDeleter } from '../infrastructure/DocumentFileDeleter';

function toDocumentDto(document: Document): DocumentDto {
  return {
    id: document.id,
    path: document.path,
    title: document.title,
    lastModified: document.lastModified,
    linkCount: document.linkCount,
    isOrphaned: document.isOrphaned,
  };
}

function toDocFolderDto(folder: DocFolder): DocFolderDto {
  return {
    id: folder.id,
    path: folder.path,
    documentCount: folder.documentCount,
    signature: {
      fileCount: folder.signature.fileCount,
      topLevelFileNames: folder.signature.topLevelFileNames,
      directoryDepth: folder.signature.directoryDepth,
    },
  };
}

/**
 * Document read model and lifecycle commands. All error strings are the
 */
export class DocumentService {
  constructor(
    private readonly config: DocsFolderConfigStore,
    private readonly documents: DocumentJsonRepository,
    private readonly fileDeleter: DocumentFileDeleter,
    private readonly events: EventBus
  ) {}

  async getAll(workspaceId: string): Promise<GetAllDocumentsResponse> {
    const docsFolderPath = await this.config.readDocsFolderPath(workspaceId);
    const documents = await this.documents.findAllNonDeleted(workspaceId);

    let docFolder: DocFolderDto | null = null;
    if (docsFolderPath) {
      // yields null rather than a stale folder.
      const folder = await this.config.readDocFolder(workspaceId);
      if (folder && folder.path === docsFolderPath) {
        docFolder = toDocFolderDto(folder);
      }
    }

    return { documents: documents.map(toDocumentDto), docFolder };
  }

  async getDeleted(workspaceId: string): Promise<readonly DocumentDto[]> {
    const deleted = await this.documents.findAllDeleted(workspaceId);
    return deleted.map(toDocumentDto);
  }

  async getOrphans(workspaceId: string): Promise<readonly DocumentDto[]> {
    const orphans = await this.documents.findOrphaned(workspaceId);
    return orphans.map(toDocumentDto);
  }

  async softDelete(workspaceId: string, documentId: string): Promise<void> {
    const document = await this.requireDocument(workspaceId, documentId);
    await this.documents.softDelete(workspaceId, document.id);
    this.events.emit('DocumentDeleted', { documentId: document.id, path: document.path });
  }

  async restore(workspaceId: string, documentId: string): Promise<void> {
    const document = await this.requireDocument(workspaceId, documentId);
    await this.documents.restore(workspaceId, document.id);
  }

  async permanentDelete(workspaceId: string, documentId: string): Promise<void> {
    const document = await this.requireDocument(workspaceId, documentId);
    await this.fileDeleter.deleteFile(workspaceId, document.path);
    await this.documents.delete(workspaceId, document.id);
    this.events.emit('DocumentDeleted', { documentId: document.id, path: document.path });
  }

  async setLinkCountIfChanged(
    workspaceId: string,
    documentId: string,
    totalCount: number
  ): Promise<void> {
    const document = await this.documents.findById(workspaceId, documentId);
    if (!document) return;
    if (document.linkCount === totalCount) return;
    document.updateLinkCount(totalCount);
    await this.documents.save(workspaceId, document);
  }

  private async requireDocument(workspaceId: string, documentId: string): Promise<Document> {
    const document = await this.documents.findById(workspaceId, documentId);
    if (!document) {
      throw new DomainException('DOCUMENT_NOT_FOUND', 'Document not found');
    }
    return document;
  }
}