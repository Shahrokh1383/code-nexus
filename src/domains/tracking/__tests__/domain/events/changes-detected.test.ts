import { ChangesDetectedEvent } from '../../../domain/events/changes-detected';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { DiffId } from '../../../domain/value-objects/diff-id';

describe('ChangesDetectedEvent', () => {
  it('should create with correct properties', () => {
    const filePath = new FilePath('src/app.ts');
    const oldHash = new HashValue('a'.repeat(64));
    const newHash = new HashValue('b'.repeat(64));
    const diffId = new DiffId('diff-1');

    const event = new ChangesDetectedEvent(filePath, oldHash, newHash, diffId);

    expect(event.eventType).toBe('ChangesDetectedEvent');
    expect(event.filePath.equals(filePath)).toBe(true);
    expect(event.oldHash.equals(oldHash)).toBe(true);
    expect(event.newHash.equals(newHash)).toBe(true);
    expect(event.diffId.equals(diffId)).toBe(true);
  });

  it('should have eventId and occurredOn', () => {
    const event = new ChangesDetectedEvent(
      new FilePath('src/app.ts'),
      new HashValue('a'.repeat(64)),
      new HashValue('b'.repeat(64)),
      new DiffId('diff-1')
    );
    expect(event.eventId).toBeDefined();
    expect(event.occurredOn).toBeDefined();
  });
});