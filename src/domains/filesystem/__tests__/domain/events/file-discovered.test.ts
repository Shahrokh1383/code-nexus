import { FileDiscoveredEvent } from '../../../../domain/events/file-discovered';
import { FileNodeId } from '../../../../domain/value-objects/file-node-id';
import { FolderNodeId } from '../../../../domain/value-objects/folder-node-id';
import { FilePath } from '../../../../domain/value-objects/file-path';

describe('FileDiscoveredEvent', () => {
  it('should create a file discovered event for a file', () => {
    const id = new FileNodeId('file-1');
    const path = new FilePath('src/index.ts');
    const event = new FileDiscoveredEvent(id, path, false);

    expect(event.eventType).toBe('FileDiscovered');
    expect(event.fileNodeId).toBe(id);
    expect(event.path.value).toBe('src/index.ts');
    expect(event.isDirectory).toBe(false);
    expect(event.occurredOn).toBeDefined();
    expect(event.eventId).toBeDefined();
  });

  it('should create a file discovered event for a directory', () => {
    const id = new FolderNodeId('folder-1');
    const path = new FilePath('src');
    const event = new FileDiscoveredEvent(id, path, true);

    expect(event.isDirectory).toBe(true);
    expect(event.fileNodeId).toBe(id);
  });
});