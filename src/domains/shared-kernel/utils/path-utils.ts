export class PathUtils {
  static normalize(path: string): string {
    return path
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '');
  }

  static join(...paths: string[]): string {
    const normalized = paths.map((p) => this.normalize(p));
    return normalized.join('/').replace(/\/+/g, '/');
  }

  static relative(from: string, to: string): string {
    const normFrom = this.normalize(from).split('/');
    const normTo = this.normalize(to).split('/');

    let i = 0;
    while (i < normFrom.length && i < normTo.length && normFrom[i] === normTo[i]) {
      i++;
    }

    const upCount = normFrom.length - i;
    const downParts = normTo.slice(i);
    const result = Array(upCount).fill('..').concat(downParts);

    return result.length === 0 ? '.' : result.join('/');
  }

  /**
   * Resolves '.' and '..' segments in a normalized path.
   * Example: 'a/b/../../c' → 'a/c'
   */
  private static resolveSegments(path: string): string {
    const segments = path.split('/');
    const resolved: string[] = [];

    for (const segment of segments) {
      if (segment === '..') {
        // Remove the last segment if possible, otherwise keep '..' (root-relative)
        if (resolved.length > 0 && resolved[resolved.length - 1] !== '..') {
          resolved.pop();
        } else {
          resolved.push('..');
        }
      } else if (segment !== '.' && segment !== '') {
        resolved.push(segment);
      }
    }

    return resolved.join('/');
  }

  static isWithin(parent: string, child: string): boolean {
    const normParent = this.normalize(parent);
    const normChild = this.normalize(child);

    // Resolve traversal to get the real child path
    const resolvedChild = this.resolveSegments(normChild);

    // Exact match
    if (resolvedChild === normParent) {
      return true;
    }

    // Must be a strict child (starts with parent + '/')
    return resolvedChild.startsWith(normParent + '/');
  }
}