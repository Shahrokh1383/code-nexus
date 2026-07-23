import { DocumentLinkCreatedEvent } from '../../../domain/events/document-link-created';
import { DocumentLinkId } from '../../../domain/value-objects/document-link-id';

describe('DocumentLinkCreatedEvent', () => {
  it('should carry the link id and document ids', () => {
    const linkId = DocumentLinkId.generate();
    const event = new DocumentLinkCreatedEvent(linkId, 'parent-1', 'child-2');

    expect(event.eventType).toBe('DocumentLinkCreatedEvent');
    expect(event.linkId).toBe(linkId);
    expect(event.parentDocumentId).toBe('parent-1');
    expect(event.childDocumentId).toBe('child-2');
  });
});