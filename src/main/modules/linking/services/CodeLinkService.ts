import type { EventBus } from '../../../shared/event-bus/event-bus';
import { DomainException } from '../../../shared/errors/domain-exception';
import type { CodeToDocLinkDto, BulkCreateResult } from '@shared/ipc/linking';
import { CodeToDocLink } from '../domain/CodeToDocLink';
import { LinkMigration } from '../domain/LinkMigration';
import type { LinkJsonRepository } from '../infrastructure/LinkJsonRepository';
import type { DocumentLinkJsonRepository } from '../infrastructure/DocumentLinkJsonRepository';
import type { FilesystemCodeFileQuery } from '../infrastructure/FilesystemCodeFileQuery';

export class CodeLinkService {
  private readonly migration = new LinkMigration();

  constructor(
    private readonly linkRepo: LinkJsonRepository,
    private readonly docLinkRepo: DocumentLinkJsonRepository,
    private readonly codeFileQuery: FilesystemCodeFileQuery,
    private readonly events: EventBus,
  ) {}

  /**
   * Normalizes a path to be workspace-relative and forward-slash separated.
   * Prevents Windows backslash mismatches between file-index.json and tracking events.
   */
  private normalizePath(rootPath: string, p: string): string {
    const rootN = rootPath.replace(/\\/g, '/').replace(/\/+$/, '');
    let norm = p.replace(/\\/g, '/');
    if (norm.startsWith(rootN + '/')) norm = norm.slice(rootN.length + 1);
    if (norm.startsWith('./')) norm = norm.slice(2);
    return norm;
  }

  async resolveCodeFileId(rootPath: string, rawId: string): Promise<string | null> {
    const allFiles = await this.codeFileQuery.getAllCodeFiles(rootPath);
    const validIds = new Set(allFiles.map((f) => f.id));
    if (validIds.has(rawId)) return rawId;

    // Match by normalized path
    const normalizedRawId = this.normalizePath(rootPath, rawId);
    const byPath = new Map(allFiles.map((f) => [this.normalizePath(rootPath, f.path), f.id]));
    return byPath.get(normalizedRawId) ?? null;
  }

  async createLink(rootPath: string, rawCodeFileId: string, documentId: string): Promise<void> {
    const codeFileId = await this.resolveCodeFileId(rootPath, rawCodeFileId);
    if (!codeFileId) {
      throw new DomainException('CODE_FILE_NOT_FOUND', 'Code file not found in index');
    }

    const existing = await this.linkRepo.findByCodeFileAndDocument(rootPath, codeFileId, documentId);
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

  async createBulk(rootPath: string, rawCodeFileIds: string[], documentId: string): Promise<BulkCreateResult> {
    const allFiles = await this.codeFileQuery.getAllCodeFiles(rootPath);
    const validIds = new Set(allFiles.map((f) => f.id));
    const byPath = new Map(allFiles.map((f) => [this.normalizePath(rootPath, f.path), f.id]));

    const createdIds: string[] = [];
    const skippedIds: string[] = [];

    for (const rawId of rawCodeFileIds) {
      const normalizedRawId = this.normalizePath(rootPath, rawId);
      const codeFileId = validIds.has(rawId) ? rawId : byPath.get(normalizedRawId);
      
      if (!codeFileId) {
        skippedIds.push(rawId);
        continue;
      }

      const existing = await this.linkRepo.findByCodeFileAndDocument(rootPath, codeFileId, documentId);
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

  async getLinksForDocument(rootPath: string, documentId: string): Promise<CodeToDocLinkDto[]> {
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
          codeFilePath: file ? this.normalizePath(rootPath, file.path) : '',
        };
      })
      .filter((link) => link.codeFileName !== '');
  }

  async getLinksForCodeFile(rootPath: string, codeFileId: string): Promise<CodeToDocLinkDto[]> {
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
      codeFilePath: file ? this.normalizePath(rootPath, file.path) : '',
    }));
  }

  async getAllLinks(rootPath: string): Promise<CodeToDocLinkDto[]> {
    const links = await this.linkRepo.findAll(rootPath);
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
          codeFilePath: file ? this.normalizePath(rootPath, file.path) : '',
        };
      })
      .filter((link) => link.codeFileName !== '');
  }

  async getUnlinkedCodeFiles(rootPath: string): Promise<{ id: string; name: string; path: string }[]> {
    const allFiles = await this.codeFileQuery.getAllCodeFiles(rootPath);
    const allLinks = await this.linkRepo.findAll(rootPath);
    const linkedIds = new Set(allLinks.map((l) => l.codeFileId));
    return allFiles
      .filter((f) => !linkedIds.has(f.id))
      .map((f) => ({ ...f, path: this.normalizePath(rootPath, f.path) }));
  }

  async migrate(rootPath: string, oldDocumentId: string, newDocumentIds: string[]): Promise<void> {
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

  async migrateFromDeletedDocument(rootPath: string, deletedDocumentId: string): Promise<void> {
    const childLinks = await this.docLinkRepo.findByParentDocument(rootPath, deletedDocumentId);
    if (childLinks.length === 0) return;
    const childIds = childLinks.map((l) => l.childDocumentId);
    await this.migrate(rootPath, deletedDocumentId, childIds);
  }

  async purgeLinksForDeletedDocument(rootPath: string, deletedDocumentId: string): Promise<void> {
    const links = await this.linkRepo.findByDocument(rootPath, deletedDocumentId);
    if (links.length === 0) return;
    await this.linkRepo.deleteMany(rootPath, links.map((l) => l.id));
  }
}