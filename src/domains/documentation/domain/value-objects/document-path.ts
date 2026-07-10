import { ValueObject } from '../../../shared-kernel/types/value-object';
import { PathUtils } from '../../../shared-kernel/utils/path-utils';

export class DocumentPath extends ValueObject {
  private readonly _value: string;

  constructor(value: string) {
    super();
    const normalized = PathUtils.normalize(value);
    if (!normalized || normalized.length === 0) {
      throw new Error('Document path cannot be empty');
    }
    if (normalized.startsWith('/')) {
      throw new Error('Document path must be relative, not absolute');
    }
    if (/^[a-zA-Z]:/.test(normalized)) {
      throw new Error('Document path must be relative, not absolute');
    }
    this._value = normalized;
  }

  get value(): string {
    return this._value;
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof DocumentPath)) {
      return false;
    }
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  isWithinDocsFolder(docsFolderPath: string): boolean {
    return PathUtils.isWithin(docsFolderPath, this._value);
  }
}