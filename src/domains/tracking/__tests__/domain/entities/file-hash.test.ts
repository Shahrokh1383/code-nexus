import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';

describe('FileHash', () => {
  // Factory strictly matches the 3-argument constructor of the Entity
  const createFileHash = () => {
    return new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      new HashValue('a'.repeat(64))
    );
  };

  it('should create with all required properties', () => {
    const fileHash = createFileHash();
    
    expect(fileHash.id.value).toBe('fh-1');
    expect(fileHash.filePath.value).toBe('src/app.ts');
    expect(fileHash.hashValue.value).toBe('a'.repeat(64));
  });

  it('should update hash value correctly', () => {
    const fileHash = createFileHash();
    const newHash = new HashValue('b'.repeat(64));
    
    fileHash.updateHash(newHash);
    
    expect(fileHash.hashValue.equals(newHash)).toBe(true);
    expect(fileHash.hashValue.value).toBe('b'.repeat(64));
  });

  it('should maintain immutability of id and filePath after hash update', () => {
    const fileHash = createFileHash();
    
    const originalId = fileHash.id;
    const originalPath = fileHash.filePath;
    
    // Mutate the hash
    fileHash.updateHash(new HashValue('c'.repeat(64)));
    
    // Verify identity and path remain strictly unchanged (SRP compliance)
    expect(fileHash.id).toBe(originalId);
    expect(fileHash.filePath).toBe(originalPath);
  });
});