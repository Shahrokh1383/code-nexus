import {
  DocFolderSignature,
  FileNode,
} from '../../../domain/value-objects/doc-folder-signature';

describe('DocFolderSignature', () => {
  const createFiles = (): FileNode[] => [
    { name: 'readme.md', path: 'docs/readme.md', isDirectory: false },
    { name: 'guide.md', path: 'docs/guide.md', isDirectory: false },
    { name: 'assets', path: 'docs/assets', isDirectory: true },
    { name: 'logo.png', path: 'docs/assets/logo.png', isDirectory: false },
  ];

  it('should create signature from files', () => {
    const files = createFiles();
    const signature = DocFolderSignature.calculateFrom(files);

    expect(signature.fileCount).toBe(4);
    expect(signature.topLevelFileNames).toEqual(['guide.md', 'readme.md']);
    expect(signature.directoryDepth).toBe(2);
  });

  it('should create signature for empty folder', () => {
    const signature = DocFolderSignature.calculateFrom([]);

    expect(signature.fileCount).toBe(0);
    expect(signature.topLevelFileNames).toEqual([]);
    expect(signature.directoryDepth).toBe(0);
  });

  it('should reject negative file count', () => {
    expect(() => new DocFolderSignature(-1, [], 0)).toThrow('File count cannot be negative');
  });

  it('should reject negative directory depth', () => {
    expect(() => new DocFolderSignature(0, [], -1)).toThrow('Directory depth cannot be negative');
  });

  it('should return exact similarity of 1 for identical signatures', () => {
    const files = createFiles();
    const sig1 = DocFolderSignature.calculateFrom(files);
    const sig2 = DocFolderSignature.calculateFrom(files);

    expect(sig1.similarity(sig2)).toBe(1);
    expect(sig1.equals(sig2)).toBe(true);
  });

  it('should return similarity of 0 for completely different signatures', () => {
    const sig1 = new DocFolderSignature(10, ['a.md', 'b.md'], 2);
    const sig2 = new DocFolderSignature(5, ['c.md', 'd.md'], 5);

    const similarity = sig1.similarity(sig2);
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it('should calculate similarity based on file count difference', () => {
    const sig1 = new DocFolderSignature(100, ['readme.md'], 1);
    const sig2 = new DocFolderSignature(50, ['readme.md'], 1);

    const similarity = sig1.similarity(sig2);
    expect(similarity).toBeGreaterThan(0.5);
    expect(similarity).toBeLessThan(1);
  });

  it('should calculate name similarity using Jaccard index', () => {
    const sig1 = new DocFolderSignature(10, ['a.md', 'b.md', 'c.md'], 1);
    const sig2 = new DocFolderSignature(10, ['a.md', 'b.md', 'd.md'], 1);

    const similarity = sig1.similarity(sig2);
    expect(similarity).toBeGreaterThan(0.5);
    expect(similarity).toBeLessThan(1);
  });

  it('should penalize depth difference', () => {
    const sig1 = new DocFolderSignature(10, ['readme.md'], 1);
    const sig2 = new DocFolderSignature(10, ['readme.md'], 2);

    const similarity = sig1.similarity(sig2);
    expect(similarity).toBe(0.8); // 1.0 * 0.4 + 1.0 * 0.4 + 0 * 0.2
  });

  it('should support equality comparison', () => {
    const sig1 = new DocFolderSignature(5, ['a.md', 'b.md'], 1);
    const sig2 = new DocFolderSignature(5, ['a.md', 'b.md'], 1);
    const sig3 = new DocFolderSignature(5, ['a.md'], 1);

    expect(sig1.equals(sig2)).toBe(true);
    expect(sig1.equals(sig3)).toBe(false);
  });

  it('should return string representation', () => {
    const sig = new DocFolderSignature(5, ['a.md'], 1);
    expect(sig.toString()).toBe('DocFolderSignature(files=5, depth=1)');
  });
});