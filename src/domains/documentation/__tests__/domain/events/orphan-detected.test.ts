import { DocumentId } from '../../../domain/value-objects/document-id';
import { DocumentPath } from '../../../domain/value-objects/document-path';
import { OrphanDetectedEvent } from '../../../domain/events/orphan-detected';

describe('OrphanDetectedEvent', () => {
  it('should create event with correct payload', () => {
    const id = DocumentId.generate();
    const path = new DocumentPath('docs/unlinked.md');
    const event = new OrphanDetectedEvent(id, path);

    expect(event.eventType).toBe('OrphanDetectedEvent');
    expect(event.documentId).toBe(id);
    expect(event.path).toBe(path);
    expect(event.occurredOn).toBeDefined();
    expect(event.eventId).toBeDefined();
  });
});