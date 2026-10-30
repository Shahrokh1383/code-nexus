/**
 * Cross-platform path normalization utilities.
 */
export class PathUtils {
  static normalize(path: string): string {
    let normalized = path
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '');

    normalized = normalized.replace(/^([A-Za-z]):\//, (_, letter: string) => `${letter.toLowerCase()}:/`);
    return normalized;
  }

  static join(...paths: string[]): string {
    const normalized = paths.map((p) => this.normalize(p));
    return normalized.join('/').replace(/\/+/g, '/');
  }

  static isAbsolute(path: string): boolean {
    return path.startsWith('/') || /^[A-Za-z]:/.test(path);
  }

  static isWithin(parentPath: string, childPath: string): boolean {
    const parent = this.normalize(parentPath);
    const child = this.normalize(childPath);
    if (child === parent) return true;
    return child.startsWith(parent.endsWith('/') ? parent : `${parent}/`);
  }

  static relative(fromPath: string, toPath: string): string {
    const fromParts = this.normalize(fromPath).split('/').filter((s) => s.length > 0 && s !== '.');
    const toParts = this.normalize(toPath).split('/').filter((s) => s.length > 0 && s !== '.');

    let common = 0;
    while (common < fromParts.length && common < toParts.length && fromParts[common] === toParts[common]) {
      common++;
    }

    const upSegments = fromParts.slice(common).map(() => '..');
    return [...upSegments, ...toParts.slice(common)].join('/');
  }
}