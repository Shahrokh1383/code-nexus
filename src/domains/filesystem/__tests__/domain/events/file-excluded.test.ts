import { FileExcludedEvent } from '../../../domain/events/file-excluded';
import { FileNodeId } from '../../../domain/value-objects/file-node-id';
import { FilePath } from '../../../domain/value-objects/file-path';
import { FolderNodeId } from '../../../domain/value-objects/folder-node-id';

describe('FileExcludedEvent', () => {
  it('should create an event with fileNodeId when provided', () => {
    const id = new FileNodeId('file-1');
    const path = new FilePath('src/legacy.ts');
    const event = new FileExcludedEvent(id, path);

    expect(event.eventType).toBe('FileExcluded');
    expect(event.fileNodeId).toBe(id);
    expect(event.path.value).toBe('src/legacy.ts');
  });

  it('should create an event without fileNodeId (undefined)', () => {
    const path = new FilePath('src/temp.log');
    const event = new FileExcludedEvent(undefined, path);

    expect(event.eventType).toBe('FileExcluded');
    expect(event.fileNodeId).toBeUndefined();
    expect(event.path.value).toBe('src/temp.log');
  });

  it('should accept FolderNodeId as fileNodeId', () => {
    const folderId = new FolderNodeId('folder-1');
    const path = new FilePath('docs');
    const event = new FileExcludedEvent(folderId, path);

    expect(event.fileNodeId).toBe(folderId);
    expect(event.path.value).toBe('docs');
  });
});