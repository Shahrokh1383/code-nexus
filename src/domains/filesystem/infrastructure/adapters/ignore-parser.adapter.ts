export class IgnoreMatcher {
  private readonly patterns: Array<{ pattern: string; negated: boolean }>;

  constructor(patterns: string[]) {
    this.patterns = patterns.map((p) => ({
      pattern: p.startsWith('!') ? p.slice(1) : p,
      negated: p.startsWith('!'),
    }));
  }

  test(filePath: string): boolean {
    let ignored = false;

    for (const { pattern, negated } of this.patterns) {
      if (this.matchGlob(filePath, pattern)) {
        ignored = !negated;
      }
    }

    return ignored;
  }

  private matchGlob(path: string, pattern: string): boolean {
    if (pattern.endsWith('/')) {
      const dirName = pattern.slice(0, -1);
      return path === dirName || path.startsWith(pattern);
    }

    const regexSource = pattern
      .replace(/\*\*\//g, '({{GLOBSTAR}}/|)')
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
      .replace(/{{GLOBSTAR}}/g, '.*');

    return new RegExp(`^${regexSource}$`).test(path);
  }
}

export class IgnoreParserAdapter {
  parse(patterns: string[]): IgnoreMatcher {
    return new IgnoreMatcher(patterns);
  }

  isIgnored(path: string, matcher: IgnoreMatcher): boolean {
    return matcher.test(path);
  }
}