import { randomUUID } from 'crypto';

export type LinkType = 'DIRECT' | 'INHERITED';

/**
 * registration here; events are emitted by CodeLinkService after persistence
 */
export class CodeToDocLink {
  private _type: LinkType;
  private _migratedAt: string | null;

  private constructor(
    public readonly id: string,
    public readonly codeFileId: string,
    public readonly documentId: string,
    type: LinkType,
    public readonly createdAt: string,
    migratedAt: string | null
  ) {
    this._type = type;
    this._migratedAt = migratedAt;
  }

  get type(): LinkType {
    return this._type;
  }

  get migratedAt(): string | null {
    return this._migratedAt;
  }

  static create(codeFileId: string, documentId: string): CodeToDocLink {
    return new CodeToDocLink(
      randomUUID(),
      codeFileId,
      documentId,
      'DIRECT',
      new Date().toISOString(),
      null
    );
  }

  static reconstitute(
    id: string,
    codeFileId: string,
    documentId: string,
    type: LinkType,
    createdAt: string,
    migratedAt: string | null
  ): CodeToDocLink {
    return new CodeToDocLink(id, codeFileId, documentId, type, createdAt, migratedAt);
  }

  /**
   * Marks a DIRECT link as INHERITED after migration. Timestamp is set on the
   * transition, matching legacy CodeToDocLink.markAsInherited verbatim.
   */
  markAsInherited(): void {
    if (this._type === 'INHERITED') return;
    this._type = 'INHERITED';
    this._migratedAt = new Date().toISOString();
  }
}