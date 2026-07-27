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

    // Simple literal name match (no wildcards, no slash)
    if (!this._pattern.includes('/') && !/[?*[\]]/.test(this._pattern)) {
      const name = this._pattern.endsWith('/') ? this._pattern.slice(0, -1) : this._pattern;
      return normalized.split('/').some(segment => segment === name);
    }

    // Directory pattern ending with '/'
    if (this._pattern.endsWith('/')) {
      const dirName = this._pattern.slice(0, -1);
      return normalized === dirName || normalized.startsWith(this._pattern);
    }

    // Exact full‑path match
    if (this._pattern === normalized) {
      return true;
    }

    // Convert to glob regex, handling implicit "**/" for patterns without a slash
    const patternForRegex = this.needsGlobstarPrefix()
      ? `**/${this._pattern}`
      : this._pattern;

    const regexPattern = this.globToRegex(patternForRegex);
    return new RegExp(`^${regexPattern}$`).test(normalized);
  }

  /**
   * Returns true if the pattern has wildcards but no slash.
   * In that case the pattern should match any subdirectory (like .gitignore).
   */
  private needsGlobstarPrefix(): boolean {
    return !this._pattern.includes('/') && /[*?[\]]/.test(this._pattern);
  }

  private globToRegex(pattern: string): string {
    let regex = '';
    let i = 0;

    while (i < pattern.length) {
      const ch = pattern[i];

      if (ch === '*') {
        if (i + 1 < pattern.length && pattern[i + 1] === '*') {
          i += 2;
          if (i < pattern.length && pattern[i] === '/') {
            i++;
            regex += '(.*/)?';
          } else {
            regex += '.*';
          }
        } else {
          i++;
          regex += '[^/]*';
        }
      } else if (ch === '?') {
        i++;
        regex += '[^/]';
      } else {
        if ('.[]{}()+-^$|'.includes(ch)) {
          regex += '\\' + ch;
        } else {
          regex += ch;
        }
        i++;
      }
    }

    return regex;
  }

  equals(other: IgnorePattern): boolean {
    return this._pattern === other._pattern;
  }
}