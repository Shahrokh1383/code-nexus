import { DocFolderSignature } from '../../../domain/value-objects/doc-folder-signature';
import { DocsFolderRelocatedEvent } from '../../../domain/events/docs-folder-relocated';

describe('DocsFolderRelocatedEvent', () => {
  it('should create event with correct payload', () => {
    const signature = new DocFolderSignature(5, ['readme.md'], 1);
    const event = new DocsFolderRelocatedEvent('docs', 'documentation', signature);

    expect(event.eventType).toBe('DocsFolderRelocatedEvent');
    expect(event.oldPath).toBe('docs');
    expect(event.newPath).toBe('documentation');
    expect(event.signature).toBe(signature);
    expect(event.occurredOn).toBeDefined();
    expect(event.eventId).toBeDefined();
  });
});