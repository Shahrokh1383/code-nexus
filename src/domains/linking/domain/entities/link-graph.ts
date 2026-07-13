import { AggregateRoot } from '../../../shared-kernel/types/aggregate-root';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../filesystem/domain/value-objects/file-node-id';
import { LinksMigratedEvent } from '../events/links-migrated';
import { DocumentLinkId } from '../value-objects/document-link-id';
import { LinkGraphId } from '../value-objects/link-graph-id';
import { LinkId } from '../value-objects/link-id';
import { CodeToDocLink } from './code-to-doc-link';
import { DocumentToDocumentLink } from './document-to-document-link';

export class LinkGraph extends AggregateRoot {
  private _codeLinks: CodeToDocLink[];
  private _documentLinks: DocumentToDocumentLink[];

  private constructor(
    public readonly id: LinkGraphId,
    codeLinks: CodeToDocLink[],
    documentLinks: DocumentToDocumentLink[]
  ) {
    super();
    this._codeLinks = codeLinks;
    this._documentLinks = documentLinks;
  }

  static create(): LinkGraph {
    return new LinkGraph(LinkGraphId.generate(), [], []);
  }

  static reconstitute(id: LinkGraphId, codeLinks: CodeToDocLink[], documentLinks: DocumentToDocumentLink[]): LinkGraph {
    return new LinkGraph(id, codeLinks, documentLinks);
  }

  get codeLinks(): CodeToDocLink[] {
    return [...this._codeLinks];
  }

  get documentLinks(): DocumentToDocumentLink[] {
    return [...this._documentLinks];
  }

  addCodeLink(link: CodeToDocLink): void {
    if (this._codeLinks.some(l => l.id.equals(link.id))) return;
    
    this._codeLinks.push(link);
    this.registerEventsFromEntity(link);
  }

  addDocumentLink(link: DocumentToDocumentLink): void {
    if (this._documentLinks.some(l => l.id.equals(link.id))) return;
    
    this._documentLinks.push(link);
    this.registerEventsFromEntity(link);
  }

  removeCodeLink(id: LinkId): void {
    const link = this._codeLinks.find(l => l.id.equals(id));
    if (link) {
      link.break();
      this.registerEventsFromEntity(link);
      this._codeLinks = this._codeLinks.filter(l => !l.id.equals(id));
    }
  }

  removeDocumentLink(id: DocumentLinkId): void {
    const link = this._documentLinks.find(l => l.id.equals(id));
    if (link) {
      link.break();
      this.registerEventsFromEntity(link);
      this._documentLinks = this._documentLinks.filter(l => !l.id.equals(id));
    }
  }

  findByDocument(docId: DocumentId): {
    codeLinks: CodeToDocLink[];
    childDocumentLinks: DocumentToDocumentLink[];
    parentDocumentLinks: DocumentToDocumentLink[];
  } {
    return {
      codeLinks: this._codeLinks.filter(l => l.documentId.equals(docId)),
      childDocumentLinks: this._documentLinks.filter(l => l.parentDocumentId.equals(docId)),
      parentDocumentLinks: this._documentLinks.filter(l => l.childDocumentId.equals(docId))
    };
  }

  findByCodeFile(fileId: FileNodeId): CodeToDocLink[] {
    return this._codeLinks.filter(l => l.codeFileId.equals(fileId));
  }

  migrateCodeLinksFromParent(parentDocId: DocumentId, childDocIds: DocumentId[]): CodeToDocLink[] {
    const parentLinks = this._codeLinks.filter(l => l.documentId.equals(parentDocId));
    const migratedLinks: CodeToDocLink[] = [];

    for (const parentLink of parentLinks) {
      for (const childDocId of childDocIds) {
        const newLink = CodeToDocLink.create(parentLink.codeFileId, childDocId);
        newLink.markAsInherited();
        this.addCodeLink(newLink);
        migratedLinks.push(newLink);
      }
      this.removeCodeLink(parentLink.id);
    }

    if (migratedLinks.length > 0) {
      this.registerEvent(
        new LinksMigratedEvent(
          parentDocId.value,
          childDocIds.map(id => id.value),
          migratedLinks.map(l => l.id.value)
        )
      );
    }

    return migratedLinks;
  }

  private registerEventsFromEntity(entity: AggregateRoot): void {
    const events = entity.getDomainEvents();
    for (const event of events) {
      this.registerEvent(event);
    }
    entity.clearDomainEvents();
  }
}