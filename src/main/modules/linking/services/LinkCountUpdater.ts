import type { LinkJsonRepository } from '../infrastructure/LinkJsonRepository';
import type { DocumentLinkJsonRepository } from '../infrastructure/DocumentLinkJsonRepository';

/**
 * Minimal port over Documentation's public linkCount write path. Uses a
 * structural interface so this service can be typed and tested without
 * depending on documentation's concrete class (Constitution §2 — depend on
 * public contracts, not internal classes).
 */
export interface DocumentLinkCountPort {
  setLinkCountIfChanged(
    workspaceId: string,
    documentId: string,
    totalCount: number
  ): Promise<void>;
}

/**
 * Recomputes a document's linkCount from current persisted state. Ported
 * verbatim from legacy event-subscribers.ts:recalculateAndSaveDocumentLinkCount
 * (which was invoked by five event handlers). The setLinkCountIfChanged guard
 * on the documentation side performs the "unchanged → no-op" check.
 */
export class LinkCountUpdater {
  constructor(
    private readonly linkRepo: LinkJsonRepository,
    private readonly docLinkRepo: DocumentLinkJsonRepository,
    private readonly documents: DocumentLinkCountPort,
  ) {}

  async recalculate(rootPath: string, documentId: string): Promise<void> {
    const codeLinks = await this.linkRepo.findByDocument(rootPath, documentId);
    const parentDocLinks = await this.docLinkRepo.findByParentDocument(rootPath, documentId);
    const childDocLinks = await this.docLinkRepo.findByChildDocument(rootPath, documentId);
    const totalCount = codeLinks.length + parentDocLinks.length + childDocLinks.length;

    await this.documents.setLinkCountIfChanged(rootPath, documentId, totalCount);
  }
}