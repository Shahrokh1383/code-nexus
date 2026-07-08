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

  static isWithin(parent: string, child: string): boolean {
    const normParent = this.normalize(parent);
    const normChild = this.normalize(child);
    if (normChild === normParent) {
      return true;
    }
    return normChild.startsWith(normParent + '/');
  }
}