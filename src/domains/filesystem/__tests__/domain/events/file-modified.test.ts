import { FileModifiedEvent } from '../../../../domain/events/file-modified';
import { FileNodeId } from '../../../../domain/value-objects/file-node-id';
import { FilePath } from '../../../../domain/value-objects/file-path';
import { FileHash } from '../../../../domain/value-objects/file-hash';

describe('FileModifiedEvent', () => {
  it('should create a file modified event', () => {
    const id = new FileNodeId('file-1');
    const path = new FilePath('src/index.ts');
    const hash = new FileHash('a'.repeat(64));
    const event = new FileModifiedEvent(id, path, hash);

    expect(event.eventType).toBe('FileModified');
    expect(event.fileNodeId).toBe(id);
    expect(event.path.value).toBe('src/index.ts');
    expect(event.newHash.value).toBe('a'.repeat(64));
  });
});