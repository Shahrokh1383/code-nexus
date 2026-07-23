import { DocumentLinkBrokenEvent } from '../../../domain/events/document-link-broken';
import { DocumentLinkId } from '../../../domain/value-objects/document-link-id';

describe('DocumentLinkBrokenEvent', () => {
  it('should carry the link id and document ids', () => {
    const linkId = DocumentLinkId.generate();
    const event = new DocumentLinkBrokenEvent(linkId, 'parent-1', 'child-2');

    expect(event.eventType).toBe('DocumentLinkBrokenEvent');
    expect(event.linkId).toBe(linkId);
    expect(event.parentDocumentId).toBe('parent-1');
    expect(event.childDocumentId).toBe('child-2');
  });
});