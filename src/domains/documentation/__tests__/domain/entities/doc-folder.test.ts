import { DocFolder } from '../../../domain/entities/doc-folder';
import { DocFolderId } from '../../../domain/value-objects/doc-folder-id';
import { DocFolderSignature } from '../../../domain/value-objects/doc-folder-signature';

describe('DocFolder', () => {
  const createSignature = (): DocFolderSignature => {
    return new DocFolderSignature(5, ['readme.md', 'guide.md'], 2);
  };

  const createDocFolder = (path: string = 'docs'): DocFolder => {
    return new DocFolder(DocFolderId.generate(), path, createSignature(), 3);
  };

  it('should create a doc folder with all properties', () => {
    const id = DocFolderId.generate();
    const signature = createSignature();

    const folder = new DocFolder(id, 'docs', signature, 10);

    expect(folder.id).toBe(id);
    expect(folder.path).toBe('docs');
    expect(folder.signature).toBe(signature);
    expect(folder.documentCount).toBe(10);
  });

  it('should normalize path on creation', () => {
    const folder = new DocFolder(
      DocFolderId.generate(),
      'docs\\guides',
      createSignature()
    );
    expect(folder.path).toBe('docs/guides');
  });

  it('should reject empty path', () => {
    expect(() => new DocFolder(
      DocFolderId.generate(),
      '',
      createSignature()
    )).toThrow('Doc folder path cannot be empty');
  });

  it('should reject negative document count', () => {
    expect(() => new DocFolder(
      DocFolderId.generate(),
      'docs',
      createSignature(),
      -1
    )).toThrow('Document count cannot be negative');
  });

  it('should update signature', () => {
    const folder = createDocFolder();
    const newSignature = new DocFolderSignature(10, ['a.md'], 1);
    folder.updateSignature(newSignature);
    expect(folder.signature).toBe(newSignature);
  });

  it('should relocate to new path', () => {
    const folder = createDocFolder('docs');
    folder.relocate('documentation');
    expect(folder.path).toBe('documentation');
  });

  it('should normalize path on relocate', () => {
    const folder = createDocFolder('docs');
    folder.relocate('documentation\\guides');
    expect(folder.path).toBe('documentation/guides');
  });

  it('should reject empty path on relocate', () => {
    const folder = createDocFolder();
    expect(() => folder.relocate('')).toThrow('Doc folder path cannot be empty');
  });

  it('should update document count', () => {
    const folder = createDocFolder();
    folder.updateDocumentCount(20);
    expect(folder.documentCount).toBe(20);
  });

  it('should reject negative document count on update', () => {
    const folder = createDocFolder();
    expect(() => folder.updateDocumentCount(-1)).toThrow(
      'Document count cannot be negative'
    );
  });
});