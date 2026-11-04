import type { EventBus } from '../../../shared/event-bus/event-bus';
import { DomainException } from '../../../shared/errors/domain-exception';
import type { DocumentLinkDto } from '@shared/ipc/linking';
import { DocumentToDocumentLink } from '../domain/DocumentToDocumentLink';
import type { DocumentLinkValidator } from '../domain/DocumentLinkValidator';
import type { DocumentLinkJsonRepository } from '../infrastructure/DocumentLinkJsonRepository';

/**
 * Document-to-document link service. Behavior ported verbatim from the legacy
 * document-link IPC handlers. Cycle/self-link validation happens BEFORE
 * persistence (matches legacy CreateDocumentLinkHandler).
 */
export class DocumentLinkService {
  constructor(
    private readonly repo: DocumentLinkJsonRepository,
    private readonly validator: DocumentLinkValidator,
    private readonly events: EventBus,
  ) {}

  async create(
    rootPath: string,
    parentDocumentId: string,
    childDocumentId: string
  ): Promise<void> {
    await this.validator.validateNoCycles(rootPath, parentDocumentId, childDocumentId);

    const link = DocumentToDocumentLink.create(parentDocumentId, childDocumentId);
    await this.repo.save(rootPath, link);

    this.events.emit('DocumentLinkCreated', {
      linkId: link.id,
      parentDocumentId,
      childDocumentId,
    });
  }

  async remove(rootPath: string, linkId: string): Promise<void> {
    const link = await this.repo.findById(rootPath, linkId);
    if (!link) {
      throw new DomainException('LINK_NOT_FOUND', 'Link not found');
    }

    await this.repo.delete(rootPath, linkId);

    this.events.emit('DocumentLinkBroken', {
      linkId: link.id,
      parentDocumentId: link.parentDocumentId,
      childDocumentId: link.childDocumentId,
    });
  }

  async getChildren(
    rootPath: string,
    parentDocumentId: string
  ): Promise<DocumentLinkDto[]> {
    const links = await this.repo.findByParentDocument(rootPath, parentDocumentId);
    return links.map((link) => this.toDto(link));
  }

  async getParents(
    rootPath: string,
    childDocumentId: string
  ): Promise<DocumentLinkDto[]> {
    const links = await this.repo.findByChildDocument(rootPath, childDocumentId);
    return links.map((link) => this.toDto(link));
  }

  private toDto(link: DocumentToDocumentLink): DocumentLinkDto {
    return {
      id: link.id,
      parentDocumentId: link.parentDocumentId,
      childDocumentId: link.childDocumentId,
      type: link.type,
      createdAt: link.createdAt,
    };
  }
}