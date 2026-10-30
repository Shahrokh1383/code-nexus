import { PathUtils } from '../../../shared/utils/path-utils';

/**
 * Documentation domain entity. Paths are workspace-relative, forward-slashed
 * and normalized (Constitution §17). `isOrphaned` is always derived from
 * `linkCount` — legacy semantics preserved verbatim, including the rule that
 * a persisted `isOrphaned` flag is recomputed on every load.
 */
export class Document {
  private _path: string;
  private _title: string;
  private _lastModified: string;
  private _linkCount: number;
  private _isOrphaned: boolean;
  private _deleted: boolean;

  constructor(
    private readonly _id: string,
    path: string,
    title: string,
    lastModified: string,
    linkCount: number = 0,
    deleted: boolean = false
  ) {
    if (!title || title.trim().length === 0) {
      throw new Error('Document title cannot be empty');
    }
    if (linkCount < 0) {
      throw new Error('Link count cannot be negative');
    }
    const normalized = PathUtils.normalize(path);
    if (!normalized || normalized.length === 0) {
      throw new Error('Document path cannot be empty');
    }
    if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
      throw new Error('Document path must be relative, not absolute');
    }
    this._path = normalized;
    this._title = title.trim();
    this._lastModified = lastModified;
    this._linkCount = linkCount;
    this._isOrphaned = linkCount === 0;
    this._deleted = deleted;
  }

  get id(): string { return this._id; }
  get path(): string { return this._path; }
  get title(): string { return this._title; }
  get lastModified(): string { return this._lastModified; }
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

  updateLastModified(lastModified: string): void {
    this._lastModified = lastModified;
  }

  updatePath(newPath: string): void {
    const normalized = PathUtils.normalize(newPath);
    if (!normalized || normalized.length === 0) {
      throw new Error('Document path cannot be empty');
    }
    if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
      throw new Error('Document path must be relative, not absolute');
    }
    this._path = normalized;
  }
}