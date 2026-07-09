import { DomainException } from '../../../shared-kernel/exceptions/domain-exception';
import { PathUtils } from '../../../shared-kernel/utils/path-utils';

export class FilePath {
  private readonly _value: string;

  constructor(value: string) {
    const normalized = PathUtils.normalize(value);

    if (!normalized || normalized.length === 0 || normalized === '.') {
      throw new DomainException('FILE_PATH_EMPTY', 'File path cannot be empty');
    }

    if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
      throw new DomainException('FILE_PATH_ABSOLUTE', 'File path must be relative to workspace root');
    }

    if (normalized.includes('..')) {
      throw new DomainException('FILE_PATH_TRAVERSAL', 'File path contains invalid traversal segments');
    }

    this._value = normalized;
  }

  get value(): string {
    return this._value;
  }

  getName(): string {
    const segments = this._value.split('/');
    return segments[segments.length - 1] || '';
  }

  getParentPath(): FilePath {
    const segments = this._value.split('/');
    segments.pop();
    const parentValue = segments.join('/') || '.';
    return new FilePath(parentValue);
  }

  equals(other: FilePath): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}