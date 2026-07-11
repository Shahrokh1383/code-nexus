import { HashComparisonService } from '../../../domain/services/hash-comparison.service';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';

describe('HashComparisonService', () => {
  const service = new HashComparisonService();
  const filePath = new FilePath('src/app.ts');

  it('should return false when hashes are equal', () => {
    const hash = new HashValue('a'.repeat(64));
    expect(service.hasChanged(hash, hash)).toBe(false);
  });

  it('should return true when hashes differ', () => {
    const oldHash = new HashValue('a'.repeat(64));
    const newHash = new HashValue('b'.repeat(64));
    expect(service.hasChanged(oldHash, newHash)).toBe(true);
  });

  it('should return null event when hashes are equal', () => {
    const hash = new HashValue('a'.repeat(64));
    const event = service.detectChanges(hash, hash, filePath);
    expect(event).toBeNull();
  });

  it('should return ChangesDetectedEvent when hashes differ', () => {
    const oldHash = new HashValue('a'.repeat(64));
    const newHash = new HashValue('b'.repeat(64));
    const event = service.detectChanges(oldHash, newHash, filePath);

    expect(event).not.toBeNull();
    expect(event?.eventType).toBe('ChangesDetectedEvent');
    expect(event?.filePath.equals(filePath)).toBe(true);
    expect(event?.oldHash.equals(oldHash)).toBe(true);
    expect(event?.newHash.equals(newHash)).toBe(true);
  });

  it('should include correct filePath in event', () => {
    const customPath = new FilePath('src/components/Button.tsx');
    const oldHash = new HashValue('a'.repeat(64));
    const newHash = new HashValue('b'.repeat(64));
    const event = service.detectChanges(oldHash, newHash, customPath);

    expect(event?.filePath.value).toBe('src/components/Button.tsx');
  });
});