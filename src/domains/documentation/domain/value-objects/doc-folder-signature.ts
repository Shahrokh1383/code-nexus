import { ValueObject } from '../../../shared-kernel/types/value-object';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
}

export class DocFolderSignature extends ValueObject {
  constructor(
    private readonly _fileCount: number,
    private readonly _topLevelFileNames: readonly string[],
    private readonly _directoryDepth: number
  ) {
    super();
    if (_fileCount < 0) {
      throw new Error('File count cannot be negative');
    }
    if (_directoryDepth < 0) {
      throw new Error('Directory depth cannot be negative');
    }
  }

  get fileCount(): number {
    return this._fileCount;
  }

  get topLevelFileNames(): string[] {
    return [...this._topLevelFileNames];
  }

  get directoryDepth(): number {
    return this._directoryDepth;
  }

  static calculateFrom(files: FileNode[]): DocFolderSignature {
    const fileCount = files.length;

    // Determine the common root directory
    let rootPath = '';
    if (files.length > 0) {
      const segments = files.map(f => f.path.split('/').filter(s => s.length > 0));
      const minLen = Math.min(...segments.map(s => s.length));
      let commonPrefixLength = 0;
      for (let i = 0; i < minLen; i++) {
        const segment = segments[0][i];
        if (segments.every(s => s[i] === segment)) {
          commonPrefixLength++;
        } else {
          break;
        }
      }
      rootPath = segments[0].slice(0, commonPrefixLength).join('/');
    }

    // Top-level files are non-directory items whose path relative to root has exactly one segment
    const topLevelFileNames = files
      .filter(f => {
        if (f.isDirectory) return false;
        const relative = rootPath ? f.path.slice(rootPath.length).replace(/^\//, '') : f.path;
        return !relative.includes('/');
      })
      .map(f => f.name)
      .sort();

    // Calculate max depth relative to the doc folder root
    let maxDepth = 0;
    for (const file of files) {
      const relativePath = rootPath ? file.path.slice(rootPath.length).replace(/^\//, '') : file.path;
      const depth = relativePath.split('/').filter(s => s.length > 0).length;
      if (depth > maxDepth) maxDepth = depth;
    }

    return new DocFolderSignature(fileCount, topLevelFileNames, maxDepth);
  }

  similarity(other: DocFolderSignature): number {
    const maxCount = Math.max(this._fileCount, other._fileCount, 1);
    const countDiff = Math.abs(this._fileCount - other._fileCount);
    const countScore = 1 - countDiff / maxCount;

    const setA = new Set(this._topLevelFileNames);
    const setB = new Set(other._topLevelFileNames);
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    const nameScore = union.size === 0 ? 1 : intersection.size / union.size;

    const depthDiff = Math.abs(this._directoryDepth - other._directoryDepth);
    const depthScore = depthDiff === 0 ? 1 : 0;

    return countScore * 0.4 + nameScore * 0.4 + depthScore * 0.2;
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof DocFolderSignature)) {
      return false;
    }
    if (this._fileCount !== other._fileCount) {
      return false;
    }
    if (this._directoryDepth !== other._directoryDepth) {
      return false;
    }
    if (this._topLevelFileNames.length !== other._topLevelFileNames.length) {
      return false;
    }
    for (let i = 0; i < this._topLevelFileNames.length; i++) {
      if (this._topLevelFileNames[i] !== other._topLevelFileNames[i]) {
        return false;
      }
    }
    return true;
  }

  toString(): string {
    return `DocFolderSignature(files=${this._fileCount}, depth=${this._directoryDepth})`;
  }
}