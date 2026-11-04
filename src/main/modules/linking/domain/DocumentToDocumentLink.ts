import { randomUUID } from 'crypto';
import type { LinkType } from './CodeToDocLink';

export class DocumentToDocumentLink {
  private _type: LinkType;

  private constructor(
    public readonly id: string,
    public readonly parentDocumentId: string,
    public readonly childDocumentId: string,
    type: LinkType,
    public readonly createdAt: string
  ) {
    this._type = type;
  }

  get type(): LinkType {
    return this._type;
  }

  static create(parentDocumentId: string, childDocumentId: string): DocumentToDocumentLink {
    return new DocumentToDocumentLink(
      randomUUID(),
      parentDocumentId,
      childDocumentId,
      'DIRECT',
      new Date().toISOString()
    );
  }

  static reconstitute(
    id: string,
    parentDocumentId: string,
    childDocumentId: string,
    type: LinkType,
    createdAt: string
  ): DocumentToDocumentLink {
    return new DocumentToDocumentLink(id, parentDocumentId, childDocumentId, type, createdAt);
  }

  markAsInherited(): void {
    if (this._type === 'INHERITED') return;
    this._type = 'INHERITED';
  }
}