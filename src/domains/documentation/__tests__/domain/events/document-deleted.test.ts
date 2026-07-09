import { DocumentId } from '../../../domain/value-objects/document-id';
import { DocumentPath } from '../../../domain/value-objects/document-path';
import { DocumentDeletedEvent } from '../../../domain/events/document-deleted';

describe('DocumentDeletedEvent', () => {
  it('should create event with correct payload', () => {
    const id = DocumentId.generate();
    const path = new DocumentPath('docs/obsolete.md');
    const event = new DocumentDeletedEvent(id, path);

    expect(event.eventType).toBe('DocumentDeletedEvent');
    expect(event.documentId).toBe(id);
    expect(event.path).toBe(path);
    expect(event.occurredOn).toBeDefined();
    expect(event.eventId).toBeDefined();
  });
});