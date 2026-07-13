import { AggregateRoot } from '../../../shared-kernel/types/aggregate-root';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { Maybe } from '../../../shared-kernel/types/maybe';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../filesystem/domain/value-objects/file-node-id';
import { LinkBrokenEvent } from '../events/link-broken';
import { LinkCreatedEvent } from '../events/link-created';
import { LinkId } from '../value-objects/link-id';
import { LinkType } from '../value-objects/link-type';

export class CodeToDocLink extends AggregateRoot {
  private _type: LinkType;
  private _migratedAt: Maybe<DateTime>;

  private constructor(
    public readonly id: LinkId,
    public readonly codeFileId: FileNodeId,
    public readonly documentId: DocumentId,
    type: LinkType,
    public readonly createdAt: DateTime,
    migratedAt: Maybe<DateTime>
  ) {
    super();
    this._type = type;
    this._migratedAt = migratedAt;
  }

  get type(): LinkType {
    return this._type;
  }

  get migratedAt(): Maybe<DateTime> {
    return this._migratedAt;
  }

  static create(codeFileId: FileNodeId, documentId: DocumentId): CodeToDocLink {
    const link = new CodeToDocLink(
      LinkId.generate(),
      codeFileId,
      documentId,
      LinkType.direct(),
      DateTime.now(),
      Maybe.none<DateTime>()
    );
    
    link.registerEvent(
      new LinkCreatedEvent(link.id, 'code', link.codeFileId.value, link.documentId.value)
    );
    
    return link;
  }

  static reconstitute(
    id: LinkId,
    codeFileId: FileNodeId,
    documentId: DocumentId,
    type: LinkType,
    createdAt: DateTime,
    migratedAt: Maybe<DateTime>
  ): CodeToDocLink {
    return new CodeToDocLink(id, codeFileId, documentId, type, createdAt, migratedAt);
  }

  markAsInherited(): void {
    if (this._type.isInherited()) return;
    
    this._type = LinkType.inherited();
    this._migratedAt = Maybe.some(DateTime.now());
  }

  break(): void {
    this.registerEvent(
      new LinkBrokenEvent(this.id, 'code', this.codeFileId.value, this.documentId.value)
    );
  }
}