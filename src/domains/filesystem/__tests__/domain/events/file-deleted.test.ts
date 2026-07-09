import { FileDeletedEvent } from '../../../domain/events/file-deleted';
import { FileNodeId } from '../../../domain/value-objects/file-node-id';
import { FilePath } from '../../../domain/value-objects/file-path';

describe('FileDeletedEvent', () => {
  it('should create a file deleted event', () => {
    const id = new FileNodeId('file-1');
    const path = new FilePath('src/index.ts');
    const event = new FileDeletedEvent(id, path);

    expect(event.eventType).toBe('FileDeleted');
    expect(event.fileNodeId).toBe(id);
    expect(event.path.value).toBe('src/index.ts');
  });
});