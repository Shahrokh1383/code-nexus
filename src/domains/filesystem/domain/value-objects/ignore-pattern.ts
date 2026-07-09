import { DomainException } from '../../../shared-kernel/exceptions/domain-exception';
import { PathUtils } from '../../../shared-kernel/utils/path-utils';

export class IgnorePattern {
  private readonly _pattern: string;

  constructor(pattern: string) {
    const trimmed = pattern.trim();

    if (!trimmed || trimmed.length === 0) {
      throw new DomainException('IGNORE_PATTERN_EMPTY', 'Ignore pattern cannot be empty');
    }

    this._pattern = trimmed;
  }

  get pattern(): string {
    return this._pattern;
  }

  matches(path: string): boolean {
    const normalized = PathUtils.normalize(path);

    if (this._pattern.endsWith('/')) {
      const dirName = this._pattern.slice(0, -1);
      return normalized === dirName || normalized.startsWith(this._pattern);
    }

    if (this._pattern === normalized) {
      return true;
    }

    const regexPattern = this._pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
      .replace(/{{GLOBSTAR}}/g, '.*');

    return new RegExp(`^${regexPattern}$`).test(normalized);
  }

  equals(other: IgnorePattern): boolean {
    return this._pattern === other._pattern;
  }
}