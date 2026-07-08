import { MetadataFolderName } from '../../../domain/value-objects/metadata-folder-name';

describe('MetadataFolderName', () => {
  it('should always return .doclink', () => {
    const folder = new MetadataFolderName();
    expect(folder.value).toBe('.doclink');
  });

  it('should be equal to another instance', () => {
    const f1 = new MetadataFolderName();
    const f2 = new MetadataFolderName();
    expect(f1.equals(f2)).toBe(true);
  });

  it('should return .doclink from toString', () => {
    const folder = new MetadataFolderName();
    expect(folder.toString()).toBe('.doclink');
  });
});