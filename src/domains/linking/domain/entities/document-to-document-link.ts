import { AggregateRoot } from '../../../shared-kernel/types/aggregate-root';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { DocumentLinkBrokenEvent } from '../events/document-link-broken';
import { DocumentLinkCreatedEvent } from '../events/document-link-created';
import { DocumentLinkId } from '../value-objects/document-link-id';
import { LinkType } from '../value-objects/link-type';

export class DocumentToDocumentLink extends AggregateRoot {
  private _type: LinkType;

  private constructor(
    public readonly id: DocumentLinkId,
    public readonly parentDocumentId: DocumentId,
    public readonly childDocumentId: DocumentId,
    type: LinkType,
    public readonly createdAt: DateTime
  ) {
    super();
    this._type = type;
  }

  get type(): LinkType {
    return this._type;
  }

  static create(parentDocumentId: DocumentId, childDocumentId: DocumentId): DocumentToDocumentLink {
    const link = new DocumentToDocumentLink(
      DocumentLinkId.generate(),
      parentDocumentId,
      childDocumentId,
      LinkType.direct(),
      DateTime.now()
    );

    link.registerEvent(
      new DocumentLinkCreatedEvent(link.id, link.parentDocumentId.value, link.childDocumentId.value)
    );

    return link;
  }

  static reconstitute(
    id: DocumentLinkId,
    parentDocumentId: DocumentId,
    childDocumentId: DocumentId,
    type: LinkType,
    createdAt: DateTime
  ): DocumentToDocumentLink {
    return new DocumentToDocumentLink(id, parentDocumentId, childDocumentId, type, createdAt);
  }

  markAsInherited(): void {
    if (this._type.isInherited()) return;
    this._type = LinkType.inherited();
  }

  break(): void {
    this.registerEvent(
      new DocumentLinkBrokenEvent(this.id, this.parentDocumentId.value, this.childDocumentId.value)
    );
  }
}