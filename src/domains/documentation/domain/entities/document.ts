import { DateTime } from '../../../shared-kernel/types/date-time';
import { DocumentId } from '../value-objects/document-id';
import { DocumentPath } from '../value-objects/document-path';

export class Document {
  private _title: string;
  private _lastModified: DateTime;
  private _linkCount: number;
  private _isOrphaned: boolean;
  private _deleted: boolean;
  private _path: DocumentPath;

  constructor(
    private readonly _id: DocumentId,
    path: DocumentPath,
    title: string,
    lastModified: DateTime,
    linkCount: number = 0,
    deleted: boolean = false
  ) {
    if (!title || title.trim().length === 0) {
      throw new Error('Document title cannot be empty');
    }
    if (linkCount < 0) {
      throw new Error('Link count cannot be negative');
    }
    this._path = path;
    this._title = title.trim();
    this._lastModified = lastModified;
    this._linkCount = linkCount;
    this._isOrphaned = linkCount === 0;
    this._deleted = deleted;
  }

  get id(): DocumentId { return this._id; }
  get path(): DocumentPath { return this._path; }
  get title(): string { return this._title; }
  get lastModified(): DateTime { return this._lastModified; }
  get linkCount(): number { return this._linkCount; }
  get isOrphaned(): boolean { return this._isOrphaned; }
  get deleted(): boolean { return this._deleted; }

  markAsDeleted(): void { this._deleted = true; }
  markAsRestored(): void { this._deleted = false; }

  markAsOrphaned(): void { this._isOrphaned = true; this._linkCount = 0; }
  markAsLinked(): void { this._isOrphaned = false; }

  updateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Document title cannot be empty');
    }
    this._title = title.trim();
  }

  updateLinkCount(count: number): void {
    if (count < 0) { throw new Error('Link count cannot be negative'); }
    this._linkCount = count;
    this._isOrphaned = count === 0;
  }

  updateLastModified(lastModified: DateTime): void {
    this._lastModified = lastModified;
  }

  updatePath(newPath: DocumentPath): void {
    this._path = newPath;
  }
}