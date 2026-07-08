import { DomainException } from '../../../shared-kernel/exceptions/domain-exception';
import { PathUtils } from '../../../shared-kernel/utils/path-utils';

export class WorkspacePath {
  private readonly _value: string;

  constructor(value: string) {
    const normalized = PathUtils.normalize(value);

    if (!normalized || normalized.length === 0) {
      throw new DomainException('WORKSPACE_PATH_EMPTY', 'Workspace path cannot be empty');
    }

    const isAbsoluteUnix = normalized.startsWith('/');
    const isAbsoluteWindows = /^[A-Za-z]:\//.test(normalized);
    const isAbsolute = isAbsoluteUnix || isAbsoluteWindows;

    if (!isAbsolute) {
      throw new DomainException('WORKSPACE_PATH_NOT_ABSOLUTE', 'Workspace path must be absolute');
    }

    if (normalized.includes('..')) {
      throw new DomainException('WORKSPACE_PATH_TRAVERSAL', 'Workspace path contains invalid traversal segments');
    }

    this._value = normalized;
  }

  get value(): string {
    return this._value;
  }

  equals(other: WorkspacePath): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}