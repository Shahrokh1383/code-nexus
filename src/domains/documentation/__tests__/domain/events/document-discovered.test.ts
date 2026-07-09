import { DocumentId } from '../../../domain/value-objects/document-id';
import { DocumentPath } from '../../../domain/value-objects/document-path';
import { DocumentDiscoveredEvent } from '../../../domain/events/document-discovered';

describe('DocumentDiscoveredEvent', () => {
  it('should create event with correct payload', () => {
    const id = DocumentId.generate();
    const path = new DocumentPath('docs/readme.md');
    const event = new DocumentDiscoveredEvent(id, path, 'Readme');

    expect(event.eventType).toBe('DocumentDiscoveredEvent');
    expect(event.documentId).toBe(id);
    expect(event.path).toBe(path);
    expect(event.title).toBe('Readme');
    expect(event.occurredOn).toBeDefined();
    expect(event.eventId).toBeDefined();
  });
});