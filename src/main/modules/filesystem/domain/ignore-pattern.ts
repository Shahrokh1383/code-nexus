import { DomainException } from '../../../shared/errors/domain-exception';
import { PathUtils } from '../../../shared/utils/path-utils';

/**
 * Ignore-pattern matching engine — ported verbatim from the legacy
 * IgnorePattern value object. Correctness-critical: it drives both UI tree
 * filtering and file-index deletion, so its matching semantics must not
 * change (literal segment match, trailing-slash directory patterns, exact
 * match, implicit globstar prefix for slash-less wildcard patterns).
 */
export class IgnorePattern {
  private readonly pattern: string;

  constructor(pattern: string) {
    const trimmed = pattern.trim();

    if (!trimmed || trimmed.length === 0) {
      throw new DomainException('IGNORE_PATTERN_EMPTY', 'Ignore pattern cannot be empty');
    }

    this.pattern = trimmed;
  }

  get value(): string {
    return this.pattern;
  }

  matches(path: string): boolean {
    const normalized = PathUtils.normalize(path);

    // Simple literal name match (no wildcards, no slash)
    if (!this.pattern.includes('/') && !/[?*[\]]/.test(this.pattern)) {
      const name = this.pattern.endsWith('/') ? this.pattern.slice(0, -1) : this.pattern;
      return normalized.split('/').some((segment) => segment === name);
    }

    // Directory pattern ending with '/'
    if (this.pattern.endsWith('/')) {
      const dirName = this.pattern.slice(0, -1);
      return normalized === dirName || normalized.startsWith(this.pattern);
    }

    // Exact full-path match
    if (this.pattern === normalized) {
      return true;
    }

    // Convert to glob regex, handling implicit "**/" for patterns without a slash
    const patternForRegex = this.needsGlobstarPrefix() ? `**/${this.pattern}` : this.pattern;

    const regexPattern = this.globToRegex(patternForRegex);
    return new RegExp(`^${regexPattern}$`).test(normalized);
  }

  /**
   * Returns true if the pattern has wildcards but no slash.
   * In that case the pattern should match any subdirectory (like .gitignore).
   */
  private needsGlobstarPrefix(): boolean {
    return !this.pattern.includes('/') && /[*?[\]]/.test(this.pattern);
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
          regex += `\\${ch}`;
        } else {
          regex += ch;
        }
        i++;
      }
    }

    return regex;
  }
}