/**
 * Cross-platform path normalization utilities.
 * Ports the legacy PathUtils semantics verbatim: backslash → forward slash,
 * duplicate-slash collapse, trailing-slash strip, and Windows drive-letter
 * lowercasing — so the same absolute path always yields the same workspace ID.
 */
export class PathUtils {
  static normalize(path: string): string {
    let normalized = path
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '');

    normalized = normalized.replace(/^([A-Z]):\//, (_, letter: string) => `${letter.toLowerCase()}/`);
    return normalized;
  }

  static join(...paths: string[]): string {
    const normalized = paths.map((p) => this.normalize(p));
    return normalized.join('/').replace(/\/+/g, '/');
  }
}