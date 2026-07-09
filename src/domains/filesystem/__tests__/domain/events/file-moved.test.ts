import { FileMovedEvent } from '../../../domain/events/file-moved';
import { FileNodeId } from '../../../domain/value-objects/file-node-id';
import { FilePath } from '../../../domain/value-objects/file-path';

describe('FileMovedEvent', () => {
  it('should create a file moved event', () => {
    const id = new FileNodeId('file-1');
    const oldPath = new FilePath('src/old.ts');
    const newPath = new FilePath('src/new.ts');
    const event = new FileMovedEvent(id, oldPath, newPath);

    expect(event.eventType).toBe('FileMoved');
    expect(event.fileNodeId).toBe(id);
    expect(event.oldPath.value).toBe('src/old.ts');
    expect(event.newPath.value).toBe('src/new.ts');
  });
});