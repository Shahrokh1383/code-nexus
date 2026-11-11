import type { EventBus } from '../../../shared/event-bus/event-bus';
import { DomainException } from '../../../shared/errors/domain-exception';
import type { CodeToDocLinkDto, BulkCreateResult } from '@shared/ipc/linking';
import { CodeToDocLink } from '../domain/CodeToDocLink';
import { LinkMigration } from '../domain/LinkMigration';
import type { LinkJsonRepository } from '../infrastructure/LinkJsonRepository';
import type { DocumentLinkJsonRepository } from '../infrastructure/DocumentLinkJsonRepository';
import type { FilesystemCodeFileQuery } from '../infrastructure/FilesystemCodeFileQuery';

/**
 * Code-to-document link service. Owns create/remove/bulk/query/migrate
 * semantics ported verbatim from the legacy command/query handlers.
 *
 * Events are emitted AFTER persistence — matches DocumentService.softDelete
 * pattern and guarantees downstream LinkCountUpdater reads post-persist state
 * (Constitution §14).
 */
export class CodeLinkService {
  private readonly migration = new LinkMigration();

  constructor(
    private readonly linkRepo: LinkJsonRepository,
    private readonly docLinkRepo: DocumentLinkJsonRepository,
    private readonly codeFileQuery: FilesystemCodeFileQuery,
    private readonly events: EventBus,
  ) {}

  private async resolveCodeFileId(
    rootPath: string,
    rawId: string,
  ): Promise<string | null> {
    const allFiles = await this.codeFileQuery.getAllCodeFiles(rootPath);
    const validIds = new Set(allFiles.map((f) => f.id));
    if (validIds.has(rawId)) return rawId;
    const byPath = new Map(allFiles.map((f) => [f.path, f.id]));
    return byPath.get(rawId) ?? null;
  }

  async createLink(
    rootPath: string,
    rawCodeFileId: string,
    documentId: string
  ): Promise<void> {
    const codeFileId = await this.resolveCodeFileId(rootPath, rawCodeFileId);
    if (!codeFileId) {
      throw new DomainException('CODE_FILE_NOT_FOUND', 'Code file not found in index');
    }

    const existing = await this.linkRepo.findByCodeFileAndDocument(
      rootPath,
      codeFileId,
      documentId
    );
    if (existing) {
      throw new DomainException('DUPLICATE_LINK', 'Link already exists');
    }

    const link = CodeToDocLink.create(codeFileId, documentId);
    await this.linkRepo.save(rootPath, link);

    this.events.emit('LinkCreated', {
      linkId: link.id,
      category: 'code',
      sourceId: codeFileId,
      targetId: documentId,
    });
  }

  async removeLink(rootPath: string, linkId: string): Promise<void> {
    const link = await this.linkRepo.findById(rootPath, linkId);
    if (!link) {
      throw new DomainException('LINK_NOT_FOUND', 'Link not found');
    }

    await this.linkRepo.delete(rootPath, linkId);

    this.events.emit('LinkBroken', {
      linkId: link.id,
      category: 'code',
      sourceId: link.codeFileId,
      targetId: link.documentId,
    });
  }

  async createBulk(
    rootPath: string,
    rawCodeFileIds: string[],
    documentId: string
  ): Promise<BulkCreateResult> {
    const allFiles = await this.codeFileQuery.getAllCodeFiles(rootPath);
    const validIds = new Set(allFiles.map((f) => f.id));
    const byPath = new Map(allFiles.map((f) => [f.path, f.id]));

    const createdIds: string[] = [];
    const skippedIds: string[] = [];

    for (const rawId of rawCodeFileIds) {
      const codeFileId = validIds.has(rawId) ? rawId : byPath.get(rawId);
      if (!codeFileId) {
        // File no longer in index — report and continue; do not abort batch.
        skippedIds.push(rawId);
        continue;
      }

      const existing = await this.linkRepo.findByCodeFileAndDocument(
        rootPath,
        codeFileId,
        documentId
      );
      if (existing) {
        skippedIds.push(rawId);
        continue;
      }

      const link = CodeToDocLink.create(codeFileId, documentId);
      await this.linkRepo.save(rootPath, link);

      this.events.emit('LinkCreated', {
        linkId: link.id,
        category: 'code',
        sourceId: codeFileId,
        targetId: documentId,
      });

      createdIds.push(link.id);
    }

    return { createdIds, skippedIds };
  }

  async getLinksForDocument(
    rootPath: string,
    documentId: string
  ): Promise<CodeToDocLinkDto[]> {
    const links = await this.linkRepo.findByDocument(rootPath, documentId);
    const allFiles = await this.codeFileQuery.getAllCodeFiles(rootPath);
    const byId = new Map(allFiles.map((f) => [f.id, f]));

    return links
      .map((link) => {
        const file = byId.get(link.codeFileId);
        return {
          id: link.id,
          codeFileId: link.codeFileId,
          documentId: link.documentId,
          type: link.type,
          createdAt: link.createdAt,
          migratedAt: link.migratedAt,
          codeFileName: file?.name ?? '',
          codeFilePath: file?.path ?? '',
        };
      })
      // Defense in depth (Phase 4 of the prior task): dead entries filtered
      // server-side so the renderer never sees a placeholder.
      .filter((link) => link.codeFileName !== '');
  }

  async getLinksForCodeFile(
    rootPath: string,
    codeFileId: string
  ): Promise<CodeToDocLinkDto[]> {
    const links = await this.linkRepo.findByCodeFile(rootPath, codeFileId);
    const file = await this.codeFileQuery.getCodeFileById(rootPath, codeFileId);

    return links.map((link) => ({
      id: link.id,
      codeFileId: link.codeFileId,
      documentId: link.documentId,
      type: link.type,
      createdAt: link.createdAt,
      migratedAt: link.migratedAt,
      codeFileName: file?.name ?? '',
      codeFilePath: file?.path ?? '',
    }));
  }

  async getUnlinkedCodeFiles(
    rootPath: string
  ): Promise<{ id: string; name: string; path: string }[]> {
    const allFiles = await this.codeFileQuery.getAllCodeFiles(rootPath);
    const allLinks = await this.linkRepo.findAll(rootPath);
    const linkedIds = new Set(allLinks.map((l) => l.codeFileId));
    return allFiles.filter((f) => !linkedIds.has(f.id));
  }

  async migrate(
    rootPath: string,
    oldDocumentId: string,
    newDocumentIds: string[]
  ): Promise<void> {
    const oldLinks = await this.linkRepo.findByDocument(rootPath, oldDocumentId);
    const result = this.migration.migrate(newDocumentIds, oldLinks);

    for (const newLink of result.migratedLinks) {
      await this.linkRepo.save(rootPath, newLink);
    }
    for (const brokenId of result.brokenLinkIds) {
      await this.linkRepo.delete(rootPath, brokenId);
    }

    if (result.migratedLinks.length > 0) {
      this.events.emit('LinksMigrated', {
        parentDocumentId: oldDocumentId,
        childDocumentIds: newDocumentIds,
        migratedLinkIds: result.migratedLinks.map((l) => l.id),
      });
    }
  }

  /**
   * Subscribed by LinkingProvider to the documentation DocumentDeleted event.
   * Preserves legacy DocumentDeletedEventHandler semantics:
   *   - find children of deleted doc
   *   - if none → silent no-op
   *   - migrate direct code links from deleted doc to each child
   */
  async migrateFromDeletedDocument(
    rootPath: string,
    deletedDocumentId: string
  ): Promise<void> {
    const childLinks = await this.docLinkRepo.findByParentDocument(
      rootPath,
      deletedDocumentId
    );
    if (childLinks.length === 0) return;

    const childIds = childLinks.map((l) => l.childDocumentId);
    await this.migrate(rootPath, deletedDocumentId, childIds);
  }

  /**
   * Purges all code links whose target document is deleted. Phase 5 pairs
   * this with migrateFromDeletedDocument; see that method's contract.
   */
  async purgeLinksForDeletedDocument(
    rootPath: string,
    deletedDocumentId: string
  ): Promise<void> {
    const links = await this.linkRepo.findByDocument(rootPath, deletedDocumentId);
    if (links.length === 0) return;
    await this.linkRepo.deleteMany(
      rootPath,
      links.map((l) => l.id)
    );
  }
}